
import { createInterface } from 'readline';

import EnvironmentPlugin from 'vite-plugin-environment'
import { viteSingleFile } from "vite-plugin-singlefile"

const rl = createInterface({
    input: process.stdin,
    output: process.stdout
})

function readLineAsync(question, defaultValue = '') {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer);
        });
        rl.write(defaultValue)
    });
}

const defaultServer = 'http://127.0.0.1:3000'
const defaultInstance = 'https://dev3.cloud.hdw.mx'

export const generateConfig = ({ cloudInstance = defaultInstance, devServer = defaultServer, plugins = [] }) => async ({ mode }) => {
    const DB_ENV = 'DASHBOARD_PREVIEW_INSTANCE'
    const defaultInstance = process.env[DB_ENV] || cloudInstance
    const CLOUD_INSTANCE = mode === 'development' ? await readLineAsync('Please enter cloud portal instance for previews:\n', defaultInstance) as string : defaultInstance
    // eslint-disable-next-line functional/immutable-data
    process.env[DB_ENV] = CLOUD_INSTANCE
    if (CLOUD_INSTANCE !== defaultInstance) {
        console.log(`If you want to default to this instance set environment variable "${DB_ENV}" set to "${CLOUD_INSTANCE}"`);
    }

    return {
        plugins: [EnvironmentPlugin({ CLOUD_INSTANCE }), ...plugins, viteSingleFile()],
        build: {
            target: "esnext",
            assetsInlineLimit: 100000000,
            chunkSizeWarningLimit: 100000000,
            cssCodeSplit: false,
            brotliSize: false,
            rollupOptions: {
                inlineDynamicImports: true,
                input: ['widget.html', 'edit.html', 'index.html'],
                output: {
                    manualChunks: () => "not_used.js",
                },
            },
        },
        server: {
            host: '127.0.0.1',
            open: true,
            proxy: {
                '^^((?!widget\.html|edit\.html|@vite\/client|src|node_modules|@id|@react-refresh).)*$': {
                    target: CLOUD_INSTANCE,
                    secure: false,
                    changeOrigin: true,
                    configure: (proxy, _) => {
                        proxy.on('proxyReq', (_, req, res) => {
                            const cookies = req.headers.Cookie
                            if (!cookies?.[(typeof cookies === 'string' ? 'search' : 'find')](`devServer=${devServer}`)) {
                                res.setHeader('Set-Cookie', `devServer=${devServer}`)
                            }
                        })
                    }
                }
            }
        }
    }
}
