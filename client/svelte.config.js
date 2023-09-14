import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
    kit: {
        adapter: adapter({
            //fallback: '200.html',
            fallback: 'index.html',
        }),
        alias: {
            '$widgets': 'src/widgets',
            '$panels': 'src/panels',
            '$pages': 'src/pages',
            '$models': 'src/models'
        }
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
