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

    // Estado en Reposo (Inactivo - Idéntico a Imagen 2): Cápsula suave y limpia sin arcoíris
    if (u_isMoving < 0.05) {
      vec4 baseColor = texture2D(u_texture, v_uv);
      vec4 pillBg = vec4(1.0, 1.0, 1.0, 0.12);
      float borderMask = smoothstep(0.0, -1.5, dist) - smoothstep(-1.5, -2.5, dist);
      vec4 borderColor = vec4(1.0, 1.0, 1.0, 0.22) * borderMask;
      gl_FragColor = mix(pillBg + borderColor, baseColor, baseColor.a);
      return;
    }

    // Estado Activo (Al arrastrar con el dedo): Motor Óptico de Refracción Real
    float eps = 1.5;
    float dx = sdRoundedBox(p + vec2(eps, 0.0), halfSize, radius) - sdRoundedBox(p - vec2(eps, 0.0), halfSize, radius);
    float dy = sdRoundedBox(p + vec2(0.0, eps), halfSize, radius) - sdRoundedBox(p - vec2(0.0, eps), halfSize, radius);
    vec2 grad = normalize(vec2(dx, dy) + 0.0001);

    // Factor de borde (1.0 en el perímetro curvado de la gota, 0.0 en el centro plano)
    float edgeFactor = clamp(-dist / radius, 0.0, 1.0);
    float rimFactor = 1.0 - edgeFactor;

    // Desplazamiento de Refracción (Ley de Snell)
    float refrStrength = rimFactor * 0.035;
    vec2 refrDir = grad * refrStrength;

    // Aberración Cromática Física (RGB Split real solo donde el borde cruza los píxeles)
    float chromOffset = rimFactor * 0.010;
    vec2 uvR = clamp(v_uv + refrDir + grad * chromOffset, 0.0, 1.0);
    vec2 uvG = clamp(v_uv + refrDir, 0.0, 1.0);
    vec2 uvB = clamp(v_uv + refrDir - grad * chromOffset, 0.0, 1.0);

    vec4 colR = texture2D(u_texture, uvR);
    vec4 colG = texture2D(u_texture, uvG);
    vec4 colB = texture2D(u_texture, uvB);

    // Contenido refractado descompuesto en prisma
    vec4 refractedContent = vec4(colR.r, colG.g, colB.b, max(colR.a, max(colG.a, colB.a)));

    // Brillo especular superior del cristal
    float spec = clamp(-grad.y, 0.0, 1.0) * pow(rimFactor, 2.2) * 0.75;
    vec4 specularLight = vec4(1.0, 1.0, 1.0, 1.0) * spec;

    // Tinte de vidrio líquido
    vec4 liquidTint = vec4(0.06, 0.08, 0.14, 0.25);
    float alpha = smoothstep(1.0, -1.0, dist);

    vec4 finalColor = mix(liquidTint, refractedContent, refractedContent.a) + specularLight;
    gl_FragColor = finalColor * alpha;
  }
`;

export default function LiquidLensCanvas({
  navItems = [],
  activeTab = '',
  lensCenterXPercent = 50,
  lensWidthPercent = 20,
  isMoving = false,
  containerWidth = 380,
  containerHeight = 60,
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
      premultipliedAlpha: false,
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

  // Dibujar los iconos y textos en el Canvas Offscreen para alimentar la textura WebGL
  const updateBaseTexture = useCallback(() => {
    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = document.createElement('canvas');
    }
    const offCanvas = offscreenCanvasRef.current;
    const dpr = Math.min(window.devicePixelRatio || 2, 2.5);
    const width = containerWidth * dpr;
    const height = containerHeight * dpr;

    if (offCanvas.width !== width || offCanvas.height !== height) {
      offCanvas.width = width;
      offCanvas.height = height;
    }

    const ctx = offCanvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);

    const total = navItems.length;
    const itemW = width / total;

    navItems.forEach((item, idx) => {
      const cx = (idx + 0.5) * itemW;
      const cy = height * 0.38;
      const isActive = item.id === activeTab;

      // Iconos dibujados vectorialmente en Canvas
      ctx.save();
      ctx.translate(cx, cy);

      const iconColor = isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.62)';
      ctx.fillStyle = iconColor;
      ctx.strokeStyle = iconColor;
      ctx.lineWidth = 2.2 * dpr;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Siluetas con relleno según estado (WhatsApp iOS Fill Transition)
      const isFilled = isActive;
      const s = 10 * dpr;

      if (item.id === 'dashboard') {
        // 4 bloques de dashboard
        const b = 3.8 * dpr;
        const o = 1.6 * dpr;
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
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.85, 0, Math.PI * 2);
        if (isFilled) {
          ctx.fillStyle = 'rgba(255,255,255,0.25)';
          ctx.fill();
        }
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.45);
        ctx.lineTo(0, 0);
        ctx.lineTo(s * 0.38, s * 0.2);
        ctx.stroke();
      } else if (item.id === 'register') {
        // Botón Registrar (Círculo con más)
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.9, 0, Math.PI * 2);
        if (isFilled) {
          ctx.fillStyle = 'rgba(255,255,255,0.35)';
          ctx.fill();
        }
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-s * 0.4, 0);
        ctx.lineTo(s * 0.4, 0);
        ctx.moveTo(0, -s * 0.4);
        ctx.lineTo(0, s * 0.4);
        ctx.stroke();
      } else if (item.id === 'operators' || item.id === 'users') {
        // Silueta de usuario / personas (relleno sólido cuando está activo)
        ctx.beginPath();
        ctx.arc(0, -s * 0.35, s * 0.38, 0, Math.PI * 2);
        if (isFilled) ctx.fill();
        else ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, s * 0.85, s * 0.7, Math.PI * 1.1, Math.PI * 1.9);
        if (isFilled) ctx.fill();
        else ctx.stroke();
      } else {
        // Documento / PDF
        const w = s * 0.75;
        const h = s * 0.95;
        ctx.strokeRect(-w / 2, -h / 2, w, h);
        ctx.beginPath();
        ctx.moveTo(-w * 0.28, -h * 0.15);
        ctx.lineTo(w * 0.28, -h * 0.15);
        ctx.moveTo(-w * 0.28, h * 0.15);
        ctx.lineTo(w * 0.28, h * 0.15);
        ctx.stroke();
      }
      ctx.restore();

      // Etiquetas de Texto
      ctx.save();
      ctx.font = `${isActive ? 'bold' : '500'} ${10.5 * dpr}px 'Plus Jakarta Sans', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.65)';
      ctx.fillText(item.label, cx, height * 0.78);
      ctx.restore();
    });

    return offCanvas;
  }, [navItems, activeTab, containerWidth, containerHeight]);

  // Loop de Renderizado WebGL
  useEffect(() => {
    const gl = glRef.current;
    const program = programRef.current;
    const texture = textureRef.current;
    const canvas = canvasRef.current;
    if (!gl || !program || !texture || !canvas) return;

    const dpr = Math.min(window.devicePixelRatio || 2, 2.5);
    const pixelWidth = containerWidth * dpr;
    const pixelHeight = containerHeight * dpr;

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

    // Uniforms de la gota de agua
    const lensCenterPx = (lensCenterXPercent / 100) * pixelWidth;
    const lensWidthPx = (lensWidthPercent / 100) * pixelWidth;
    const lensHeightPx = (isMoving ? 66 : 48) * dpr;

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
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        borderRadius: '35px',
        pointerEvents: 'none',
        zIndex: 5
      }}
    />
  );
}
