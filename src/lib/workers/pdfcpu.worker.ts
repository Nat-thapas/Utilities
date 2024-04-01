import { Go, initGo, stdout_stderr } from '$lib/wasm_exec';
import * as BrowserFS from 'browserfs';
import type { FSModule } from 'browserfs/dist/node/core/FS';

async function configureBrowserFS() {
	await new Promise((resolve, reject) => {
		// @ts-ignore
		BrowserFS.configure({ fs: 'InMemory' }, (e) => {
			if (e) reject(e);
			// @ts-ignore
			else resolve();
		});
	});
}

let fs: FSModule | undefined;
let Buffer: any;
let pdfcpuModule: WebAssembly.Module | undefined;
let go: Go | undefined;
let initialized = false;

const wasmFile = fetch('/pdfcpu.wasm');

async function init() {
	await configureBrowserFS();
	fs = BrowserFS.BFSRequire('fs');
	Buffer = BrowserFS.BFSRequire('buffer').Buffer;

	initGo(fs, Buffer);
	go = new Go();

	if (!go) {
		postMessage({
			type: 'error',
			data: {
				message: 'Failed to initialize Go wasm runtime',
				description: 'Unknown error, you can try refreshing the page'
			}
		});
		return;
	}

	const result = await WebAssembly.instantiateStreaming(wasmFile, go.importObject);
	pdfcpuModule = result.module;

	initialized = true;
}

async function decrypt(file: File, password: string | null) {
	postMessage({ type: 'progress', data: 0 });
	if (!initialized) await init();
	postMessage({ type: 'progress', data: 10 });

	if (!fs) {
		postMessage({
			type: 'error',
			data: {
				message: 'BrowserFS is not initialized',
				description: 'Unknown error, you can try refreshing the page'
			}
		});
		return;
	}
	if (!go) {
		postMessage({
			type: 'error',
			data: {
				message: 'Go wasm runtime is not initialized',
				description: 'Unknown error, you can try refreshing the page'
			}
		});
		return;
	}
	if (!pdfcpuModule) {
		postMessage({
			type: 'error',
			data: {
				message: 'pdfcpu wasm module is not initialized',
				description: 'Unknown error, you can try refreshing the page'
			}
		});
		return;
	}

	fs.writeFileSync('/input.pdf', Buffer.from(await file.arrayBuffer()));
	postMessage({ type: 'progress', data: 20 });

	const pdfcpuInstance = await WebAssembly.instantiate(pdfcpuModule, go.importObject);
	postMessage({ type: 'progress', data: 30 });

	if (password) {
		go.argv = ['pdfcpu.wasm', 'decrypt', '-upw', password, '/input.pdf', '/output.pdf'];
	} else {
		go.argv = ['pdfcpu.wasm', 'decrypt', '/input.pdf', '/output.pdf'];
	}
	await go.run(pdfcpuInstance);
	postMessage({ type: 'progress', data: 80 });

	try {
		fs.statSync('/output.pdf');
	} catch (e) {
		if (stdout_stderr.includes('This file is not encrypted')) {
			postMessage({
				type: 'error',
				data: { message: 'Failed to decrypt PDF', description: 'The file is not encrypted' }
			});
			return;
		}
		if (stdout_stderr.includes('Please provide the correct password')) {
			if (password) {
				postMessage({
					type: 'error',
					data: { message: 'Failed to decrypt PDF', description: 'Invalid password' }
				});
			} else {
				postMessage({
					type: 'error',
					data: {
						message: 'Failed to decrypt PDF',
						description: 'Password is required to decrypt this file'
					}
				});
			}
			return;
		}
		if (stdout_stderr.includes('JavaScript error')) {
			postMessage({
				type: 'error',
				data: {
					message: 'Failed to decrypt PDF',
					description: 'Unknown JavaScript error, refresh the page and try again'
				}
			});
			console.error(e);
			return;
		}
		postMessage({
			type: 'error',
			data: {
				message: 'Failed to decrypt PDF',
				description: 'Unknown error, check the developer console for more information'
			}
		});
		console.error(e);
		return;
	}
	postMessage({ type: 'progress', data: 90 });

	let outputData = fs.readFileSync('/output.pdf');
	fs.unlinkSync('/input.pdf');
	fs.unlinkSync('/output.pdf');
	let blob = new Blob([outputData], { type: 'application/pdf' });
	postMessage({ type: 'progress', data: 100 });
	postMessage({ type: 'success', data: blob });
}

onmessage = (event) => {
	const { type, file, password } = event.data;
	switch (type) {
		case 'decrypt':
			decrypt(file, password);
			break;
		default:
			postMessage({
				type: 'error',
				data: {
					message: 'Invalid message type',
					description: 'Unknown error, you can try refreshing the page'
				}
			});
			break;
	}
};
