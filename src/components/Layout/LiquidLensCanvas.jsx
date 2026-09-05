import React, { useRef, useEffect, useCallback } from 'react';

// Shaders GLSL para el motor óptico Liquid Glass
const VERTEX_SHADER_SOURCE = `
  attribute vec2 a_position;
  varying vec2 v_uv;
  void main() {
    v_uv = (a_position + 1.0) * 0.5;
    v_uv.y = 1.0 - v_uv.y; // Invertir Y para coordenadas de textura de Canvas
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER_SOURCE = `
  precision mediump float;
  varying vec2 v_uv;
  uniform sampler2D u_texture;
  uniform vec2 u_resolution;
  uniform vec2 u_lensCenter;
  uniform vec2 u_lensSize;
  uniform float u_isMoving;

  // Distancia con signo (SDF) para una cápsula / caja redondeada
  float sdRoundedBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
  }

  void main() {
    vec2 pixelCoord = v_uv * u_resolution;
    vec2 p = pixelCoord - u_lensCenter;

    vec2 halfSize = u_lensSize * 0.5;
    float radius = min(halfSize.x, halfSize.y);
    float dist = sdRoundedBox(p, halfSize, radius);

    // Fuera de la lente: renderizar textura original nítida
    if (dist > 1.0) {
      gl_FragColor = texture2D(u_texture, v_uv);
      return;
    }

    // 1. ESTADO EN REPOSO (Inactivo / Sin arrastrar - Idéntico a Imagen 2):
    // Cápsula limpia, contenida y suave. CERO distorsión, CERO aberración cromática.
    if (u_isMoving < 0.05) {
      vec4 baseColor = texture2D(u_texture, v_uv);
      
      // Borde sutil y fondo translúcido blanco suave de la cápsula
      float borderMask = smoothstep(0.0, -1.0, dist) - smoothstep(-1.0, -2.0, dist);
      float pillAlpha = 0.14 + borderMask * 0.20;
      vec4 pillPremultiplied = vec4(pillAlpha, pillAlpha, pillAlpha, pillAlpha);

      // El icono y texto se mantienen 100% nítidos por encima de la cápsula
      gl_FragColor = baseColor + pillPremultiplied * (1.0 - baseColor.a);
      return;
    }

    // 2. ESTADO ACTIVO (Solo durante el arrastre con el dedo o mouse):
    // Gota líquida con lupa central y desdoblamiento espectral continuo a brillo completo
    float uMag = 0.22;          // Magnificación convexa en el centro (+22%)
    float bendWidth = 18.0;     // Ancho del menisco perimetral curvo
    float fres = 0.35;          // Reflejo Fresnel en el ángulo oblicuo
    float spec = 0.50;          // Línea luminosa de borde perimetral (bright rim line)

    // Gradiente de la superficie mediante el campo de distancias con signo (SDF)
    float eps = 1.5;
    float dx = sdRoundedBox(p + vec2(eps, 0.0), halfSize, radius) - sdRoundedBox(p - vec2(eps, 0.0), halfSize, radius);
    float dy = sdRoundedBox(p + vec2(0.0, eps), halfSize, radius) - sdRoundedBox(p - vec2(0.0, eps), halfSize, radius);
    vec2 grad = normalize(vec2(dx, dy) + 0.0001);

    // Centro de la lente: Curvatura convexa y Magnificación Óptica pura
    float centerProximity = clamp(-dist / radius, 0.0, 1.0);
    vec2 centerOffset = (p / u_resolution);
    vec2 baseZoomUV = v_uv - centerOffset * (uMag * pow(centerProximity, 0.75));

    // Menisco perimetral: se activa hacia el borde exterior
    float bendFactor = smoothstep(-bendWidth, 0.0, dist);

    // Vector normal 3D de la superficie de la gota de agua
    vec3 N = normalize(vec3(grad * bendFactor * 2.8, 1.0 - bendFactor * 0.85));

    // Refracción física de Snell en píxeles reales isotrópicos
    float bendPixels = pow(bendFactor, 1.3) * 14.0;
    vec2 refrUV = (grad * bendPixels) / u_resolution;

    // Dispersión cromática amplia y viva (18px de separación espectral)
    float caPixels = bendFactor * 18.0;
    vec2 dispDir = (grad * caPixels) / u_resolution;

    // Muestreo espectral continuo de 7 longitudes de onda (desde rojo hasta violeta):
    vec4 s0 = texture2D(u_texture, baseZoomUV + refrUV + dispDir * 1.00); // Rojo puro
    vec4 s1 = texture2D(u_texture, baseZoomUV + refrUV + dispDir * 0.66); // Naranja / Ámbar
    vec4 s2 = texture2D(u_texture, baseZoomUV + refrUV + dispDir * 0.33); // Amarillo cálido
    vec4 s3 = texture2D(u_texture, baseZoomUV + refrUV);                   // Verde central
    vec4 s4 = texture2D(u_texture, baseZoomUV + refrUV - dispDir * 0.33); // Cian brillante
    vec4 s5 = texture2D(u_texture, baseZoomUV + refrUV - dispDir * 0.66); // Azul eléctrico
    vec4 s6 = texture2D(u_texture, baseZoomUV + refrUV - dispDir * 1.00); // Violeta / Magenta

    // Reconstrucción espectral basada en luminancia / presencia del elemento:
    float a0 = max(s0.r, s0.a);
    float a1 = max(s1.r, s1.a);
    float a2 = max(s2.r, s2.a);
    float a3 = max(s3.r, s3.a);
    float a4 = max(s4.r, s4.a);
    float a5 = max(s5.r, s5.a);
    float a6 = max(s6.r, s6.a);

    // Canal Rojo: activado por ondas cálidas (s0, s1, s2, s3)
    float r = clamp(a0 * 0.50 + a1 * 0.45 + a2 * 0.40 + a3 * 0.25, 0.0, 1.0);

    // Canal Verde: activado por la zona media del espectro (s1, s2, s3, s4, s5)
    float g = clamp(a1 * 0.25 + a2 * 0.45 + a3 * 0.60 + a4 * 0.45 + a5 * 0.25, 0.0, 1.0);

    // Canal Azul: activado por ondas frías (s3, s4, s5, s6)
    float b = clamp(a3 * 0.25 + a4 * 0.40 + a5 * 0.45 + a6 * 0.50, 0.0, 1.0);

    float alpha = max(max(max(a0, a1), max(a2, a3)), max(max(a4, a5), a6));
    vec4 refractedContent = vec4(r, g, b, alpha);

    // 3. Efecto Fresnel (brillo blanco natural en el ángulo de incidencia rasante)
    float fresnel = pow(1.0 - N.z, 2.2) * fres;
    vec4 fresnelPremult = vec4(fresnel, fresnel, fresnel, fresnel);

    // 4. Línea luminosa de borde perimetral (bright rim line)
    float rimLine = smoothstep(0.0, -1.0, dist) - smoothstep(-1.0, -2.2, dist);
    float specularHighlight = rimLine * spec;
    vec4 specPremult = vec4(specularHighlight, specularHighlight, specularHighlight, specularHighlight);

    // Composición final: cristal limpio + contenido refractado espectral brillante + Fresnel + micro-borde
    gl_FragColor = (refractedContent + fresnelPremult + specPremult) * smoothstep(0.5, -0.5, dist);
  }
`;

export default function LiquidLensCanvas({
  navItems = [],
  activeTab = '',
  lensCenterXPercent = 50,
  lensWidthPercent = 20,
  isMoving = false,
  containerWidth = 380,
  containerHeight = 66,
  onReady = () => {}
}) {
  const canvasRef = useRef(null);
  const offscreenCanvasRef = useRef(null);
  const glRef = useRef(null);
  const programRef = useRef(null);
  const textureRef = useRef(null);
  const uniformsRef = useRef({});

  // Crear o compilar Shader
  const createShader = (gl, type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  };

  // Inicializar WebGL
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: true
    });
    if (!gl) {
      if (onReady) onReady(false);
      return;
    }
    glRef.current = gl;

    const vertShader = createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
    const fragShader = createShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SOURCE);
    if (!vertShader || !fragShader) {
      if (onReady) onReady(false);
      return;
    }

    const program = gl.createProgram();
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program));
      if (onReady) onReady(false);
      return;
    }
    programRef.current = program;

    // Cuadrilátero que cubre toda la pantalla
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        -1, -1,
         1, -1,
        -1,  1,
        -1,  1,
         1, -1,
         1,  1
      ]),
      gl.STATIC_DRAW
    );

    const aPositionLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(aPositionLocation);
    gl.vertexAttribPointer(aPositionLocation, 2, gl.FLOAT, false, 0, 0);

    // Localizar Uniforms
    uniformsRef.current = {
      u_texture: gl.getUniformLocation(program, 'u_texture'),
      u_resolution: gl.getUniformLocation(program, 'u_resolution'),
      u_lensCenter: gl.getUniformLocation(program, 'u_lensCenter'),
      u_lensSize: gl.getUniformLocation(program, 'u_lensSize'),
      u_isMoving: gl.getUniformLocation(program, 'u_isMoving')
    };

    // Textura
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    textureRef.current = texture;

    if (onReady) onReady(true);

    return () => {
      if (onReady) onReady(false);
      if (gl) {
        if (texture) gl.deleteTexture(texture);
        if (program) gl.deleteProgram(program);
      }
    };
  }, [onReady]);

  // Dibujo vectorial de todos los iconos del Dock (versión Línea vs versión Sólido)
  const drawAllNavIcons = (ctx, isFilled, width, height, dpr) => {
    const total = navItems.length;
    const itemW = width / total;
    const centerY = height * 0.5;

    navItems.forEach((item, idx) => {
      const cx = (idx + 0.5) * itemW;
      const cy = centerY - (5.0 * dpr);
      const s = 13.5 * dpr; // Proporción áurea balanceada para amplio respiro lateral

      ctx.save();
      ctx.translate(cx, cy);

      const color = isFilled ? '#FFFFFF' : 'rgba(255, 255, 255, 0.62)';
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 1.75 * dpr;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (item.id === 'dashboard') {
        // 4 bloques de dashboard
        const b = 5.2 * dpr;
        const o = 2.0 * dpr;
        if (isFilled) {
          ctx.fillRect(-b - o, -b - o, b, b);
          ctx.fillRect(o, -b - o, b, b);
          ctx.fillRect(-b - o, o, b, b);
          ctx.fillRect(o, o, b, b);
        } else {
          ctx.strokeRect(-b - o, -b - o, b, b);
          ctx.strokeRect(o, -b - o, b, b);
          ctx.strokeRect(-b - o, o, b, b);
          ctx.strokeRect(o, o, b, b);
        }
      } else if (item.id === 'history') {
        // Reloj de historial
        const r = s * 0.58;
        if (isFilled) {
          // 1. Disco blanco sólido al entrar la gota
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.fillStyle = '#FFFFFF';
          ctx.fill();

          // 2. Troquelado en negativo: perfora las manecillas en transparencia pura
          ctx.save();
          ctx.globalCompositeOperation = 'destination-out';
          ctx.lineWidth = 1.9 * dpr;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(0, -r * 0.52);
          ctx.lineTo(0, 0);
          ctx.lineTo(r * 0.44, r * 0.22);
          ctx.stroke();

          // Agujero del eje central
          ctx.beginPath();
          ctx.arc(0, 0, 1.2 * dpr, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else {
          // Modo línea en reposo
          ctx.lineWidth = 1.75 * dpr;
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(0, -r * 0.52);
          ctx.lineTo(0, 0);
          ctx.lineTo(r * 0.44, r * 0.22);
          ctx.stroke();
        }
      } else if (item.id === 'register') {
        // Botón Registrar (Círculo con '+')
        const r = s * 0.58;
        if (isFilled) {
          // 1. Disco blanco sólido al entrar la gota
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.fillStyle = '#FFFFFF';
          ctx.fill();

          // 2. Troquelado en negativo: perfora la cruz '+' en transparencia pura
          ctx.save();
          ctx.globalCompositeOperation = 'destination-out';
          ctx.lineWidth = 2.0 * dpr;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(-r * 0.48, 0);
          ctx.lineTo(r * 0.48, 0);
          ctx.moveTo(0, -r * 0.48);
          ctx.lineTo(0, r * 0.48);
          ctx.stroke();
          ctx.restore();
        } else {
          // Modo línea en reposo
          ctx.lineWidth = 1.75 * dpr;
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(-r * 0.48, 0);
          ctx.lineTo(r * 0.48, 0);
          ctx.moveTo(0, -r * 0.48);
          ctx.lineTo(0, r * 0.48);
          ctx.stroke();
        }
      } else if (item.id === 'operators') {
        // Operadores: Silueta de persona + checkmark (UserCheck)
        // Cabeza
        ctx.beginPath();
        ctx.arc(-s * 0.14, -s * 0.35, s * 0.36, 0, Math.PI * 2);
        if (isFilled) ctx.fill();
        else ctx.stroke();

        // Cuerpo
        ctx.beginPath();
        ctx.arc(-s * 0.14, s * 0.84, s * 0.68, Math.PI * 1.15, Math.PI * 1.85);
        if (isFilled) ctx.fill();
        else ctx.stroke();

        // Checkmark distintivo
        ctx.beginPath();
        ctx.moveTo(s * 0.28, -s * 0.08);
        ctx.lineTo(s * 0.46, s * 0.10);
        ctx.lineTo(s * 0.80, -s * 0.26);
        ctx.stroke();
      } else if (item.id === 'users') {
        // Icono oficial de Comunidades de WhatsApp (Imagen 2: Trío simétrico con separación y aire limpio)
        
        // 1. Acompañante izquierdo (separado hacia la izquierda)
        ctx.beginPath();
        ctx.arc(-s * 0.64, -s * 0.28, s * 0.20, 0, Math.PI * 2); // Cabeza izquierda bien separada
        if (isFilled) ctx.fill(); else ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(-s * 0.96, s * 0.50);
        ctx.quadraticCurveTo(-s * 0.78, s * 0.12, -s * 0.44, s * 0.26);
        if (isFilled) {
          ctx.lineTo(-s * 0.44, s * 0.50);
          ctx.lineTo(-s * 0.96, s * 0.50);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.stroke();
        }

        // 2. Acompañante derecho (simétrico y bien separado)
        ctx.beginPath();
        ctx.arc(s * 0.64, -s * 0.28, s * 0.20, 0, Math.PI * 2); // Cabeza derecha bien separada
        if (isFilled) ctx.fill(); else ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(s * 0.44, s * 0.26);
        ctx.quadraticCurveTo(s * 0.78, s * 0.12, s * 0.96, s * 0.50);
        if (isFilled) {
          ctx.lineTo(s * 0.44, s * 0.50);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.stroke();
        }

        // 3. Figura central principal (en el frente, equilibrada)
        ctx.beginPath();
        ctx.arc(0, -s * 0.44, s * 0.26, 0, Math.PI * 2); // Cabeza central
        if (isFilled) ctx.fill(); else ctx.stroke();

        // Torso central redondeado con respiro nítido hacia los laterales
        ctx.beginPath();
        ctx.moveTo(-s * 0.38, s * 0.52);
        ctx.quadraticCurveTo(-s * 0.32, s * 0.08, 0, s * 0.08);
        ctx.quadraticCurveTo(s * 0.32, s * 0.08, s * 0.38, s * 0.52);
        if (isFilled) {
          ctx.lineTo(-s * 0.38, s * 0.52);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.stroke();
        }
      } else {
        // Documento / PDF
        const w = s * 0.78;
        const h = s * 0.98;
        if (isFilled) {
          // 1. Hoja sólida blanca al entrar la gota
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(-w / 2, -h / 2, w, h);

          // 2. Troquelado en negativo: perfora las líneas de texto en transparencia pura
          ctx.save();
          ctx.globalCompositeOperation = 'destination-out';
          ctx.lineWidth = 2.2 * dpr;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(-w * 0.28, -h * 0.16);
          ctx.lineTo(w * 0.28, -h * 0.16);
          ctx.moveTo(-w * 0.28, h * 0.16);
          ctx.lineTo(w * 0.28, h * 0.16);
          ctx.stroke();
          ctx.restore();
        } else {
          // Modo línea en reposo
          ctx.lineWidth = 1.75 * dpr;
          ctx.strokeRect(-w / 2, -h / 2, w, h);
          ctx.beginPath();
          ctx.moveTo(-w * 0.28, -h * 0.16);
          ctx.lineTo(w * 0.28, -h * 0.16);
          ctx.moveTo(-w * 0.28, h * 0.16);
          ctx.lineTo(w * 0.28, h * 0.16);
          ctx.stroke();
        }
      }
      ctx.restore();

      // Etiquetas de Texto
      ctx.save();
      ctx.font = `${isFilled ? 'bold' : '600'} ${10.5 * dpr}px 'Plus Jakarta Sans', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = isFilled ? '#FFFFFF' : 'rgba(255, 255, 255, 0.62)';
      ctx.fillText(item.label, cx, centerY + (13.5 * dpr));
      ctx.restore();
    });
  };

  // Renderizar la textura de los iconos sobre el canvas auxiliar 2D
  const updateBaseTexture = useCallback(() => {
    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = document.createElement('canvas');
    }
    const offCanvas = offscreenCanvasRef.current;
    const dpr = Math.min(window.devicePixelRatio || 2, 2.5);
    const extraY = 16; // Permite que la gota sobresalga sutilmente 3px por arriba y 3px por abajo
    const width = containerWidth * dpr;
    const height = (containerHeight + extraY) * dpr;

    if (offCanvas.width !== width || offCanvas.height !== height) {
      offCanvas.width = width;
      offCanvas.height = height;
    }

    const ctx = offCanvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);

    // 1. CAPA EXTERIOR: Dibuja todos los iconos en versión OUTLINE (línea suave fuera de la gota)
    drawAllNavIcons(ctx, false, width, height, dpr);

    // 2. CAPA INTERIOR (MÁSCARA DE RECORTE FÍSICA):
    // Recorta con la silueta exacta de la cápsula de la gota en píxeles reales
    const rawCenterPx = (lensCenterXPercent / 100) * width;
    const lensWidthPx = (lensWidthPercent / 100) * width;
    const lensHeightPx = (isMoving ? 74 : 49) * dpr;

    const halfWidthPx = lensWidthPx * 0.5;
    const edgePaddingPx = 4 * dpr;
    const lensCenterPx = isMoving
      ? Math.max(halfWidthPx + edgePaddingPx, Math.min(width - halfWidthPx - edgePaddingPx, rawCenterPx))
      : rawCenterPx;

    const lx = lensCenterPx - halfWidthPx;
    const ly = (height * 0.5) - (lensHeightPx * 0.5);
    const radius = lensHeightPx * 0.5;

    ctx.save();
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(lx, ly, lensWidthPx, lensHeightPx, radius);
    } else {
      ctx.moveTo(lx + radius, ly);
      ctx.lineTo(lx + lensWidthPx - radius, ly);
      ctx.arc(lx + lensWidthPx - radius, ly + radius, radius, -Math.PI * 0.5, Math.PI * 0.5);
      ctx.lineTo(lx + radius, ly + lensHeightPx);
      ctx.arc(lx + radius, ly + radius, radius, Math.PI * 0.5, -Math.PI * 0.5);
      ctx.closePath();
    }
    ctx.clip(); // <--- MÁSCARA VECTORIAL QUE CORTA EL ICONO EXACTAMENTE EN EL BORDE DE LA GOTA

    // 3. CAPA SÓLIDA: Dibuja los iconos en versión FILLED (sólido brillante) dentro del área recortada
    drawAllNavIcons(ctx, true, width, height, dpr);

    ctx.restore();

    return offCanvas;
  }, [navItems, activeTab, containerWidth, containerHeight, lensCenterXPercent, lensWidthPercent, isMoving]);

  // Loop de Renderizado WebGL
  useEffect(() => {
    const gl = glRef.current;
    const program = programRef.current;
    const texture = textureRef.current;
    const canvas = canvasRef.current;
    if (!gl || !program || !texture || !canvas) return;

    const extraY = 16; // 8px de holgura superior e inferior para sobresalir con sutileza elegante
    const dpr = Math.min(window.devicePixelRatio || 2, 2.5);
    const pixelWidth = containerWidth * dpr;
    const pixelHeight = (containerHeight + extraY) * dpr;

    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }

    gl.viewport(0, 0, pixelWidth, pixelHeight);
    gl.useProgram(program);

    // Actualizar textura con los iconos dibujados
    const offCanvas = updateBaseTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, offCanvas);
    gl.uniform1i(uniformsRef.current.u_texture, 0);

    // Uniforms de la gota: en reposo 49px (cápsula horizontal esbelta), en movimiento 74px (sobresale sutilmente 4px por arriba y abajo)
    const rawCenterPx = (lensCenterXPercent / 100) * pixelWidth;
    const lensWidthPx = (lensWidthPercent / 100) * pixelWidth;
    const lensHeightPx = (isMoving ? 74 : 49) * dpr;

    // Límite físico: la gota nunca debe sobrepasar el perímetro exterior izquierdo o derecho
    const halfWidthPx = lensWidthPx * 0.5;
    const edgePaddingPx = 4 * dpr;
    const lensCenterPx = isMoving
      ? Math.max(halfWidthPx + edgePaddingPx, Math.min(pixelWidth - halfWidthPx - edgePaddingPx, rawCenterPx))
      : rawCenterPx;

    gl.uniform2f(uniformsRef.current.u_resolution, pixelWidth, pixelHeight);
    gl.uniform2f(uniformsRef.current.u_lensCenter, lensCenterPx, pixelHeight * 0.5);
    gl.uniform2f(uniformsRef.current.u_lensSize, lensWidthPx, lensHeightPx);
    gl.uniform1f(uniformsRef.current.u_isMoving, isMoving ? 1.0 : 0.0);

    // Renderizar cuadrante
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }, [
    lensCenterXPercent,
    lensWidthPercent,
    isMoving,
    containerWidth,
    containerHeight,
    updateBaseTexture
  ]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: '-8px',
        left: 0,
        width: '100%',
        height: 'calc(100% + 16px)',
        pointerEvents: 'none',
        zIndex: 5
      }}
    />
  );
}
