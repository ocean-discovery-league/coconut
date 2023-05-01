import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
    kit: {
        adapter: adapter(),
    },
    vite: {
      build: {
        rollupOptions: {
          external: [/[#~]/],
        },
      },
      server: {
        watch: {
          ignored: [/[#~]/],
        },
      },
    },
};

export default config;
