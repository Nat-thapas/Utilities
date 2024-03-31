<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Progress } from '$lib/components/ui/progress';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import pdfcpuWorkerUrl from '$lib/workers/pdfcpu.worker?url';
	import Download from 'lucide-svelte/icons/download';
	import Info from 'lucide-svelte/icons/info';
	import LoaderCircle from 'lucide-svelte/icons/loader-circle';
	import { onDestroy, onMount } from 'svelte';
	import { toast } from 'svelte-sonner';

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

	let worker: Worker | undefined;

	onMount(() => {
		worker = new Worker(pdfcpuWorkerUrl, { type: 'module' });
		worker.onmessage = (event) => {
			const { type, data } = event.data;
			switch (type) {
				case 'progress':
					progressPrecent = data;
					break;
				case 'warning':
					toast.warning(data.message, {
						description: data.description
					});
					break;
				case 'error':
					toast.error(data.message, {
						description: data.description
					});
					processing = false;
					resetProgess();
					break;
				case 'success':
					const blob = data;
					downloadUrl = URL.createObjectURL(blob);
					toast.success('Processing completed!', {
						description:
							'Your file should begin downloading automatically. If not, click the download button'
					});
					const a = document.createElement('a');
					a.href = downloadUrl;
					a.download = 'output.pdf';
					a.click();
					processing = false;
					break;
			}
		};
	});

	onDestroy(() => {
		worker?.terminate();
	});

	async function decrypt() {
		resetProgess();
		processing = true;

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
		if (file.type !== 'application/pdf') {
			toast.error('Invalid file type', { description: 'Please select a PDF file' });
			processing = false;
			return;
		}
		if (!worker) {
			toast.error('Worker not initialized', { description: 'Please try again in a few seconds' });
			processing = false;
			return;
		}

		worker.postMessage({
			type: 'decrypt',
			file,
			password
		});
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
