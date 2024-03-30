<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Progress } from '$lib/components/ui/progress';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import { Go, initGo, stdout_stderr } from '$lib/wasm_exec';
	import * as BrowserFS from 'browserfs';
	import type { FSModule } from 'browserfs/dist/node/core/FS';
	import Download from 'lucide-svelte/icons/download';
	import Info from 'lucide-svelte/icons/info';
	import LoaderCircle from 'lucide-svelte/icons/loader-circle';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';

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

	onMount(async () => {
		await configureBrowserFS();
		fs = BrowserFS.BFSRequire('fs');
		Buffer = BrowserFS.BFSRequire('buffer').Buffer;

		initGo(fs, Buffer);
		go = new Go();

		if (!go) {
			toast.error('Failed to initialize Go wasm runtime', {
				description: 'Unknown error, you can try refreshing the page'
			});
			return;
		}

		const result = await WebAssembly.instantiateStreaming(fetch('/pdfcpu.wasm'), go.importObject);
		pdfcpuModule = result.module;
	});

	let downloadUrl = '';
	let progressPrecent = 0;

	function resetProgess() {
		URL.revokeObjectURL(downloadUrl);
		downloadUrl = '';
		progressPrecent = 0;
	}

	let processing = false;

	let files: FileList;
	let password: string;

	$: files, password, resetProgess();

	async function decrypt() {
		resetProgess();
		processing = true;
		if (!fs) {
			toast.error('BrowserFS is not initialized', { description: 'Try again in a few seconds' });
			processing = false;
			return;
		}
		if (!go) {
			toast.error('Go wasm runtime is not initialized', {
				description: 'Try again in a few seconds'
			});
			processing = false;
			return;
		}
		if (!pdfcpuModule) {
			toast.error('pdfcpu wasm module is not initialized', {
				description: 'Try again in a few seconds'
			});
			processing = false;
			return;
		}
		if (!files?.length) {
			toast.error('No file selected', { description: 'Please select a file' });
			processing = false;
			return;
		}
		const file = files[0];
		if (!file) {
			toast.error('No file selected', { description: 'Please select a file' });
			processing = false;
			return;
		}
		fs.writeFileSync('/input.pdf', Buffer.from(await file.arrayBuffer()));
		progressPrecent = 20;
		const pdfcpuInstance = await WebAssembly.instantiate(pdfcpuModule, go.importObject);
		if (password) {
			go.argv = ['pdfcpu.wasm', 'decrypt', '-upw', password, '/input.pdf', '/output.pdf'];
		} else {
			go.argv = ['pdfcpu.wasm', 'decrypt', '/input.pdf', '/output.pdf'];
		}
		await go.run(pdfcpuInstance);
		try {
			fs.statSync('/output.pdf');
		} catch (e) {
			if (stdout_stderr.includes('This file is not encrypted')) {
				toast.error('Failed to decrypt PDF', { description: 'The file is not encrypted' });
				processing = false;
				progressPrecent = 0;
				return;
			}
			if (stdout_stderr.includes('Please provide the correct password')) {
				if (password) {
					toast.error('Failed to decrypt PDF', { description: 'Invalid password' });
				} else {
					toast.error('Failed to decrypt PDF', {
						description: 'Password is required to decrypt this file'
					});
				}
				processing = false;
				progressPrecent = 0;
				return;
			}
			if (stdout_stderr.includes('JavaScript error')) {
				toast.error('Failed to decrypt PDF', {
					description: 'Unknown JavaScript error, refresh the page and try again'
				});
				console.error(e);
				processing = false;
				progressPrecent = 0;
				return;
			}
			toast.error('Failed to decrypt PDF', {
				description:
					'Unknown error during processing by pdfcpu wasm module. The developer console should have more information.'
			});
			console.error(e);
			processing = false;
			progressPrecent = 0;
			return;
		}
		progressPrecent = 80;
		let outputData = fs.readFileSync('/output.pdf');
		fs.unlinkSync('/input.pdf');
		fs.unlinkSync('/output.pdf');
		let blob = new Blob([outputData], { type: 'application/pdf' });
		downloadUrl = URL.createObjectURL(blob);
		toast.success('Processing completed!', {
			description:
				'Your file should begin downloading automatically. If not, click the download button'
		});
		let a = document.createElement('a');
		a.href = downloadUrl;
		a.download = 'output.pdf';
		a.click();

		progressPrecent = 100;
		processing = false;
	}
</script>

<div class="grid w-[22rem] h-fit items-center gap-1.5 mt-4 mx-auto px-4">
	<h1 class="text-xl font-semibold">Decrypt PDF</h1>
	<Separator />
	<h2 class="mb-1">Decrypt PDF and remove all restrictions</h2>
	<Label for="input-file">Input file</Label>
	<input
		id="input-file"
		class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
		type="file"
		accept="application/pdf"
		bind:files
	/>
	<div class="flex mt-1">
		<Label for="password">User password (Optional)</Label>
		<Tooltip.Root>
			<Tooltip.Trigger class="cursor-default ml-2">
				<Info class="w-4 h-4" />
			</Tooltip.Trigger>
			<Tooltip.Content>
				<p>
					User password is the password that can be use to view the file with some restrictions such
					as printing or copying. The password may be empty.
				</p>
			</Tooltip.Content>
		</Tooltip.Root>
	</div>
	<Input id="password" type="text" placeholder="User password" bind:value={password} />
	<Progress class="mt-1 mb-0.5" value={progressPrecent} />
	{#if !processing}
		{#if !files?.length}
			<Tooltip.Root>
				<Tooltip.Trigger class="cursor-default">
					<Button class="w-full" on:click={decrypt} disabled>Decrypt</Button>
				</Tooltip.Trigger>
				<Tooltip.Content>
					<p>Select a file to continue</p>
				</Tooltip.Content>
			</Tooltip.Root>
		{:else}
			<Button on:click={decrypt}>Decrypt</Button>
		{/if}
	{:else}
		<Button disabled>
			<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
			Processing: {progressPrecent.toFixed(0)}%
		</Button>
	{/if}
	{#if downloadUrl}
		<a href={downloadUrl} class="w-full h-fit" download="output.pdf">
			<Button variant="secondary" class="w-full"><Download class="mr-2 h-4 w-4" />Download</Button>
		</a>
	{/if}
</div>
