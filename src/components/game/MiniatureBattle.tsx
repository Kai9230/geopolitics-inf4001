"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import type {
  MapBattleAnimation,
} from "./MapTypes";

import styles from "./MiniatureBattle.module.css";

type Mesh = {
  positions: number[];
  normals: number[];
};

function box(): Mesh {
  const positions: number[] = [];
  const normals: number[] = [];

  const faces = [
    [
      [1, 0, 0],
      [0.5, -0.5, -0.5],
      [0.5, 0.5, -0.5],
      [0.5, 0.5, 0.5],
      [0.5, -0.5, 0.5],
    ],
    [
      [-1, 0, 0],
      [-0.5, -0.5, 0.5],
      [-0.5, 0.5, 0.5],
      [-0.5, 0.5, -0.5],
      [-0.5, -0.5, -0.5],
    ],
    [
      [0, 1, 0],
      [-0.5, 0.5, -0.5],
      [-0.5, 0.5, 0.5],
      [0.5, 0.5, 0.5],
      [0.5, 0.5, -0.5],
    ],
    [
      [0, -1, 0],
      [-0.5, -0.5, 0.5],
      [-0.5, -0.5, -0.5],
      [0.5, -0.5, -0.5],
      [0.5, -0.5, 0.5],
    ],
    [
      [0, 0, 1],
      [-0.5, -0.5, 0.5],
      [0.5, -0.5, 0.5],
      [0.5, 0.5, 0.5],
      [-0.5, 0.5, 0.5],
    ],
    [
      [0, 0, -1],
      [0.5, -0.5, -0.5],
      [-0.5, -0.5, -0.5],
      [-0.5, 0.5, -0.5],
      [0.5, 0.5, -0.5],
    ],
  ];

  for (const [normal, ...vertices] of faces) {
    for (const index of [0, 1, 2, 0, 2, 3]) {
      positions.push(...vertices[index]);
      normals.push(...normal);
    }
  }

  return { positions, normals };
}

function orb(): Mesh {
  const positions: number[] = [];
  const normals: number[] = [];

  const point = (
    latitude: number,
    longitude: number,
  ) => [
    Math.sin(latitude) *
      Math.cos(longitude) *
      0.5,

    Math.cos(latitude) * 0.5,

    Math.sin(latitude) *
      Math.sin(longitude) *
      0.5,
  ];

  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 12; x++) {
      const vertices = [
        point(
          (y * Math.PI) / 8,
          (x * Math.PI) / 6,
        ),
        point(
          ((y + 1) * Math.PI) / 8,
          (x * Math.PI) / 6,
        ),
        point(
          ((y + 1) * Math.PI) / 8,
          ((x + 1) * Math.PI) / 6,
        ),
        point(
          (y * Math.PI) / 8,
          ((x + 1) * Math.PI) / 6,
        ),
      ];

      for (const index of [0, 1, 2, 0, 2, 3]) {
        positions.push(...vertices[index]);

        normals.push(
          ...vertices[index].map(
            (value) => value * 2,
          ),
        );
      }
    }
  }

  return { positions, normals };
}

const VERTEX = `
attribute vec3 position;
attribute vec3 normal;

uniform vec3 offset;
uniform vec3 size;
uniform vec3 soldier;

uniform float fall;
uniform float aspect;
uniform float facing;

varying float light;

void main() {
  vec3 p = position * size + offset;
  p.x *= facing;

  float c = cos(fall);
  float s = sin(fall);

  p = vec3(
    p.x * c - p.y * s,
    p.x * s + p.y * c,
    p.z
  ) + soldier;

  vec3 n = normal;
  n.x *= facing;

  n = vec3(
    n.x * c - n.y * s,
    n.x * s + n.y * c,
    n.z
  );

  light = .32 + .68 * max(
    0.,
    dot(
      normalize(n),
      normalize(vec3(-.4, 1., .7))
    )
  );

  vec3 q = vec3(
    p.x * .89 + p.z * .45,
    p.y * .88 - p.z * .40 + p.x * .20,
    p.y * .42 + p.z * .79 - p.x * .40
  );

  float depth = 9. - q.z;

  gl_Position = vec4(
    q.x * 3.2 / aspect,
    (q.y - .8) * 3.2,
    depth - 1.,
    depth
  );
}
`;

const FRAGMENT = `
precision mediump float;

uniform vec3 color;
varying float light;

void main() {
  gl_FragColor = vec4(color * light, 1.);
}
`;

function rgb(hex: string): number[] {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) {
    return [0.8, 0.65, 0.3];
  }

  return [1, 3, 5].map(
    (index) =>
      parseInt(
        hex.slice(index, index + 2),
        16,
      ) / 255,
  );
}

export function MiniatureBattle({
  animation,
}: {
  animation: MapBattleAnimation;
}) {
  const canvas =
    useRef<HTMLCanvasElement>(null);

  const latest = useRef(animation);

  const [unavailable, setUnavailable] =
    useState(false);

  useEffect(() => {
    latest.current = animation;
  }, [animation]);

  useEffect(() => {
    const node = canvas.current;

    if (!node) return;

    const gl = node.getContext("webgl", {
      antialias: true,
      alpha: true,
    });

    if (!gl) {
      setUnavailable(true);
      return;
    }

    const buffers: WebGLBuffer[] = [];
    const shaders: WebGLShader[] = [];

    const program = gl.createProgram();

    if (!program) {
      setUnavailable(true);
      return;
    }

    for (const [type, source] of [
      [gl.VERTEX_SHADER, VERTEX],
      [gl.FRAGMENT_SHADER, FRAGMENT],
    ] as const) {
      const shader = gl.createShader(type)!;

      shaders.push(shader);

      gl.shaderSource(shader, source);
      gl.compileShader(shader);

      if (
        !gl.getShaderParameter(
          shader,
          gl.COMPILE_STATUS,
        )
      ) {
        setUnavailable(true);
        return;
      }

      gl.attachShader(program, shader);
    }

    gl.linkProgram(program);

    if (
      !gl.getProgramParameter(
        program,
        gl.LINK_STATUS,
      )
    ) {
      setUnavailable(true);
      return;
    }

    gl.useProgram(program);
    gl.enable(gl.DEPTH_TEST);

    const position =
      gl.getAttribLocation(
        program,
        "position",
      );

    const normal =
      gl.getAttribLocation(
        program,
        "normal",
      );

    const uniforms = Object.fromEntries(
      [
        "offset",
        "size",
        "soldier",
        "fall",
        "aspect",
        "facing",
        "color",
      ].map((name) => [
        name,
        gl.getUniformLocation(
          program,
          name,
        ),
      ]),
    );

    const upload = (mesh: Mesh) => {
      const positions = gl.createBuffer()!;
      const normals = gl.createBuffer()!;

      buffers.push(positions, normals);

      gl.bindBuffer(
        gl.ARRAY_BUFFER,
        positions,
      );

      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(mesh.positions),
        gl.STATIC_DRAW,
      );

      gl.bindBuffer(
        gl.ARRAY_BUFFER,
        normals,
      );

      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(mesh.normals),
        gl.STATIC_DRAW,
      );

      return {
        positions,
        normals,
        count: mesh.positions.length / 3,
      };
    };

    const cube = upload(box());
    const sphere = upload(orb());

    let elapsed =
      animation.active ? 0 : 2650;

    function render() {
      if (!gl || !node) return;

      const width = node.clientWidth;
      const height = node.clientHeight;

      const dpr = Math.min(
        window.devicePixelRatio || 1,
        2,
      );

      const renderWidth =
        Math.round(width * dpr);

      const renderHeight =
        Math.round(height * dpr);

      if (
        node.width !== renderWidth ||
        node.height !== renderHeight
      ) {
        node.width = renderWidth;
        node.height = renderHeight;
      }

      gl.viewport(
        0,
        0,
        node.width,
        node.height,
      );

      gl.clearColor(
        0.025,
        0.045,
        0.075,
        1,
      );

      gl.clear(
        gl.COLOR_BUFFER_BIT |
          gl.DEPTH_BUFFER_BIT,
      );

      gl.uniform1f(
        uniforms.aspect,
        width / Math.max(height, 1),
      );

      function part(
        mesh: typeof cube,
        offset: number[],
        size: number[],
        color: number[],
      ) {
        gl!.bindBuffer(
          gl!.ARRAY_BUFFER,
          mesh.positions,
        );

        gl!.enableVertexAttribArray(
          position,
        );

        gl!.vertexAttribPointer(
          position,
          3,
          gl!.FLOAT,
          false,
          0,
          0,
        );

        gl!.bindBuffer(
          gl!.ARRAY_BUFFER,
          mesh.normals,
        );

        gl!.enableVertexAttribArray(normal);

        gl!.vertexAttribPointer(
          normal,
          3,
          gl!.FLOAT,
          false,
          0,
          0,
        );

        gl!.uniform3fv(
          uniforms.offset,
          offset,
        );

        gl!.uniform3fv(
          uniforms.size,
          size,
        );

        gl!.uniform3fv(
          uniforms.color,
          color,
        );

        gl!.drawArrays(
          gl!.TRIANGLES,
          0,
          mesh.count,
        );
      }

      gl.uniform3f(
        uniforms.soldier,
        0,
        0,
        0,
      );

      gl.uniform1f(uniforms.fall, 0);
      gl.uniform1f(uniforms.facing, 1);

      part(
        cube,
        [0, -0.18, 0],
        [12, 0.24, 5.4],
        [0.13, 0.17, 0.21],
      );

      for (let side = 0; side < 2; side++) {
        const dice = latest.current.dice;

        if (!dice) continue;

        const rolls =
          side === 0
            ? dice.attacker
            : dice.defender;

        const count = Math.min(
          rolls.length,
          6,
        );

        const color = rgb(
          side === 0
            ? latest.current.attackerColor
            : latest.current.defenderColor,
        );

        for (
          let index = 0;
          index < count;
          index++
        ) {
          const attacker =
            dice.attacker[index];

          const defender =
            dice.defender[index];

          const loses =
            side === 0
              ? attacker < defender
              : defender < attacker;

          const progress = Math.min(
            1,
            elapsed / 900,
          );

          const advance =
            0.5 *
            (
              1 -
              Math.cos(
                progress * Math.PI,
              )
            );

          const fall = loses
            ? Math.min(
                1,
                Math.max(
                  0,
                  (elapsed - 1850) / 500,
                ),
              ) * 1.5
            : 0;

          gl.uniform3f(
            uniforms.soldier,

            (side === 0 ? -2.6 : 2.6) +
              (side === 0 ? 1 : -1) *
                advance,

            0,

            (
              index -
              (count - 1) / 2
            ) * 0.69,
          );

          gl.uniform1f(
            uniforms.facing,
            side === 0 ? 1 : -1,
          );

          gl.uniform1f(
            uniforms.fall,
            side === 0 ? -fall : fall,
          );

          const dark = color.map(
            (value) => value * 0.55,
          );

          // Base.
          part(
            sphere,
            [0, 0.02, 0],
            [0.78, 0.14, 0.62],
            dark,
          );

          // Legs.
          part(
            cube,
            [-0.13, 0.37, 0],
            [0.17, 0.58, 0.19],
            dark,
          );

          part(
            cube,
            [0.13, 0.37, 0],
            [0.17, 0.58, 0.19],
            dark,
          );

          // Tunic.
          part(
            cube,
            [0, 0.9, 0],
            [0.45, 0.59, 0.28],
            color,
          );

          // Head.
          part(
            sphere,
            [0, 1.39, 0],
            [0.3, 0.34, 0.3],
            [0.81, 0.65, 0.45],
          );

          // Helmet.
          part(
            sphere,
            [0, 1.55, 0],
            [0.44, 0.24, 0.4],
            color,
          );

          // Arms.
          part(
            cube,
            [0.25, 1.02, 0.03],
            [0.22, 0.18, 0.23],
            dark,
          );

          part(
            cube,
            [-0.22, 1.03, 0.03],
            [0.15, 0.42, 0.18],
            color,
          );

          // Rifle.
          part(
            cube,
            [0.4, 1.15, 0.05],
            [0.72, 0.065, 0.065],
            [0.26, 0.28, 0.3],
          );

          // Belt.
          part(
            cube,
            [0, 0.83, 0.15],
            [0.46, 0.07, 0.05],
            [0.68, 0.55, 0.26],
          );
        }
      }
    }

    const frame = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          id: number;
          elapsed: number;
        }>
      ).detail;

      if (detail.id !== animation.id) {
        return;
      }

      elapsed = detail.elapsed;
      render();
    };

    const lost = (event: Event) => {
      event.preventDefault();
      setUnavailable(true);
    };

    node.addEventListener(
      "webglcontextlost",
      lost,
    );

    window.addEventListener(
      "geopolitics-battle-frame",
      frame,
    );

    const resize = new ResizeObserver(
      () => render(),
    );

    resize.observe(node);
    render();

    return () => {
      resize.disconnect();

      window.removeEventListener(
        "geopolitics-battle-frame",
        frame,
      );

      node.removeEventListener(
        "webglcontextlost",
        lost,
      );

      for (const buffer of buffers) {
        gl.deleteBuffer(buffer);
      }

      for (const shader of shaders) {
        gl.deleteShader(shader);
      }

      gl.deleteProgram(program);
    };
  }, [animation.id, animation.active]);

  return (
    <div className={styles.tabletop}>
      <canvas
        ref={canvas}
        className={styles.canvas}
        role="img"
        aria-label={
          "Three-dimensional infantry on a " +
          "tabletop battlefield. Figures advance " +
          "and defeated soldiers fall according " +
          "to the paired dice."
        }
      />

      <span className={styles.caption}>
        {unavailable
          ? "3D unavailable on this device · Exact results remain below"
          : "TACTICAL TABLETOP · UP TO 6 FIGURES PER SIDE · ALL DICE BELOW"}
      </span>
    </div>
  );
}