<script lang="ts">
	import SortableList from '$lib/components/ui/SortableList.svelte';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Progress } from '$lib/components/ui/progress';
	import * as Select from '$lib/components/ui/select/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import ArrowDown from 'lucide-svelte/icons/arrow-down';
	import ArrowDownToLine from 'lucide-svelte/icons/arrow-down-to-line';
	import ArrowUp from 'lucide-svelte/icons/arrow-up';
	import ArrowUpToLine from 'lucide-svelte/icons/arrow-up-to-line';
	import Download from 'lucide-svelte/icons/download';
	import EllipsisVertical from 'lucide-svelte/icons/ellipsis-vertical';
	import LoaderCircle from 'lucide-svelte/icons/loader-circle';
	import Trash2 from 'lucide-svelte/icons/trash-2';
	import { onDestroy, onMount } from 'svelte';
	import { toast } from 'svelte-sonner';

	const scaleTypes = [
		{ value: 'all', label: 'All pages' },
		{ value: 'images', label: 'Images only' }
	];

	let scaleType = { value: 'all', label: 'All pages' };

	const scaleDimensions = [
		{ value: 'width', label: 'Width' },
		{ value: 'height', label: 'Height' }
	];

	let scaleDimension = { value: 'width', label: 'Width' };

	const outputSizeUnits = [
		{ value: 'mm', label: 'Millimeters' },
		{ value: 'cm', label: 'Centimeters' },
		{ value: 'in', label: 'Inches' }
	];

	let outputSizeUnit = { value: 'mm', label: 'Millimeters' };

	let outputSize = 210;

	let selectedPresetSize = 'a4';

	$: scaleDimension, outputSizeUnit, selectedPresetSize, applyPresetSize();
	$: outputSize, scaleDimension, outputSizeUnit, selectedPresetSize, scaleType, resetProgess();

	async function applyPresetSize() {
		type SizeKey =
			| 'a0'
			| 'a1'
			| 'a2'
			| 'a3'
			| 'a4'
			| 'a5'
			| 'a6'
			| 'a7'
			| 'a8'
			| 'a9'
			| 'a10'
			| 'letter'
			| 'legal';

		const sizesInch: Record<SizeKey, [number, number]> = {
			a0: [33.11024, 46.81102],
			a1: [23.38583, 33.11024],
			a2: [16.53543, 23.38583],
			a3: [11.69291, 16.53543],
			a4: [8.267717, 11.69291],
			a5: [5.826772, 8.267717],
			a6: [4.133858, 5.826772],
			a7: [2.913386, 4.133858],
			a8: [2.047244, 2.913386],
			a9: [1.456693, 2.047244],
			a10: [1.023622, 1.456693],
			letter: [8.5, 11.0],
			legal: [8.5, 14.0]
		};

		const sizesMM: Record<SizeKey, [number, number]> = {
			a0: [841, 1189],
			a1: [594, 841],
			a2: [420, 594],
			a3: [297, 420],
			a4: [210, 297],
			a5: [148, 210],
			a6: [105, 148],
			a7: [74, 105],
			a8: [52, 74],
			a9: [37, 52],
			a10: [26, 37],
			letter: [215.9, 279.4],
			legal: [215.9, 355.6]
		};

		const sizesCM: Record<SizeKey, [number, number]> = {
			a0: [84.1, 118.9],
			a1: [59.4, 84.1],
			a2: [42.0, 59.4],
			a3: [29.7, 42.0],
			a4: [21.0, 29.7],
			a5: [14.8, 21.0],
			a6: [10.5, 14.8],
			a7: [7.4, 10.5],
			a8: [5.2, 7.4],
			a9: [3.7, 5.2],
			a10: [2.6, 3.7],
			letter: [21.59, 27.94],
			legal: [21.59, 35.56]
		};

		if (selectedPresetSize === '') return;

		if (!(selectedPresetSize in sizesInch)) {
			toast.error('Invalid preset size', {
				description: 'Selected preset size is not valid, please select a valid preset size'
			});
			return;
		}
		const sizeInch = sizesInch[selectedPresetSize as SizeKey];
		const sizeMM = sizesMM[selectedPresetSize as SizeKey];
		const sizeCM = sizesCM[selectedPresetSize as SizeKey];

		switch (outputSizeUnit.value) {
			case 'mm':
				outputSize = sizeMM[scaleDimension.value === 'width' ? 0 : 1];
				break;
			case 'cm':
				outputSize = sizeCM[scaleDimension.value === 'width' ? 0 : 1];
				break;
			case 'in':
				outputSize = sizeInch[scaleDimension.value === 'width' ? 0 : 1];
				break;
			default:
				toast.error('Invalid unit', {
					description: 'Selected unit is not valid, please select a valid unit'
				});
				return;
		}
	}

	function removePresetSize() {
		selectedPresetSize = '';
	}

	function resetProgess() {
		URL.revokeObjectURL(downloadUrl);
		downloadUrl = '';
		progressPrecent = 0;
	}

	let files: FileList;
	let progressPrecent = 0;
	let processing = false;
	let downloadUrl: string = '';

	let filesPreview: Record<string, string>[] = [];

	$: files, updateFilesPreview();
	$: files, resetProgess();

	function updateFilesPreview() {
		filesPreview = [];
		if (files?.length) {
			for (let i = 0; i < files.length; i++) {
				filesPreview.push({
					id: i.toString(),
					name: files[i].name,
					type: files[i].type
				});
			}
		}
	}

	let filesPreviewComponent: any;

	function sortFilesPreviewOnDrag(event: CustomEvent) {
		resetProgess();
		filesPreview = event.detail;
	}

	function sortFilesPreviewOnClick(event: CustomEvent) {
		resetProgess();
		// @ts-ignore
		const from = event.detail.currentTarget.dataset.from;
		// @ts-ignore
		const to = event.detail.currentTarget.dataset.to;
		filesPreviewComponent.reorder({ from, to });
	}

	function removeFilePreviewOnClick(event: CustomEvent) {
		resetProgess();
		// @ts-ignore
		const index = parseInt(event.detail.currentTarget.dataset.index);
		if (index < 0) return;
		if (index >= filesPreview.length) return;
		const newFilesPreview = [...filesPreview];
		newFilesPreview.splice(index, 1);
		filesPreview = newFilesPreview;
	}

	let worker: Worker | undefined;

	onMount(() => {
		worker = new Worker(new URL('$lib/workers/pdf-lib.worker.ts', import.meta.url), {
			type: 'module'
		});

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

	async function mergeFiles() {
		processing = true;
		resetProgess();

		if (!files?.length || !filesPreview?.length) {
			toast.error('No files selected', {
				description: 'Please select at least one file to merge'
			});
			processing = false;
			return;
		}
		if (outputSize == 0) {
			toast.error('Output size cannot be zero', {
				description: "It can be less than 0 though, isn't that cool?"
			});
			processing = false;
			return;
		}
		if (!worker) {
			toast.error('Worker not initialized', { description: 'Please try again in a few seconds' });
			processing = false;
			return;
		}

		worker.postMessage({
			type: 'merge',
			files: files,
			filesPreview: filesPreview,
			scaleType: scaleType.value,
			scaleDimension: scaleDimension.value,
			outputSize: outputSize,
			outputSizeUnit: outputSizeUnit.value
		});
	}
</script>

<svelte:head>
	<title>Merge/Convert to PDF</title>
</svelte:head>

<div class="flex w-full flex-wrap justify-center">
	<div class="mt-4 grid h-fit w-[22rem] items-center gap-1.5 px-4">
		<h1 class="text-xl font-semibold">Merge/Convert to PDF</h1>
		<Separator />
		<h2 class="mb-1">Merge PDF or image files into one PDF file</h2>
		<Label for="input-files">Input files</Label>
		<input
			id="input-files"
			class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
			type="file"
			accept="application/pdf,image/png,image/jpg,image/jpeg"
			multiple
			bind:files
		/>
		<div class="flex justify-between">
			<div>
				<Label for="scale-type">Scale</Label>
				<Select.Root bind:selected={scaleType}>
					<Select.Trigger id="scale-type" class="w-36" title="Scale type">
						<Select.Value placeholder="Scale type" />
					</Select.Trigger>
					<Select.Content>
						<Select.Group>
							<Select.Label>Scale type</Select.Label>
							{#each scaleTypes as type}
								<Select.Item value={type.value} label={type.label}>{type.label}</Select.Item>
							{/each}
						</Select.Group>
					</Select.Content>
				</Select.Root>
			</div>
			<div>
				<Label for="scale-dimension">Dimension</Label>
				<Select.Root bind:selected={scaleDimension}>
					<Select.Trigger id="scale-dimension" class="w-40" title="Scale dimension">
						<Select.Value placeholder="Scale dimension" />
					</Select.Trigger>
					<Select.Content>
						<Select.Group>
							<Select.Label>Scale dimension</Select.Label>
							{#each scaleDimensions as dimension}
								<Select.Item value={dimension.value} label={dimension.label}
									>{dimension.label}</Select.Item
								>
							{/each}
						</Select.Group>
					</Select.Content>
				</Select.Root>
			</div>
		</div>
		<Label for="output-size">Output {scaleDimension.label.toLowerCase()}</Label>
		<div class="flex">
			<div
				class="mr-2 flex h-10 rounded-md border border-input bg-background text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
			>
				<Input
					type="number"
					id="output-size"
					class="mr-1 h-[2.375rem] border-0"
					placeholder="Output size"
					bind:value={outputSize}
					on:change={removePresetSize}
				/>
				<DropdownMenu.Root>
					<DropdownMenu.Trigger asChild let:builder>
						<Button variant="secondary" class="h-[2.375rem]" builders={[builder]}>Presets</Button>
					</DropdownMenu.Trigger>
					<DropdownMenu.Content class="w-32">
						<DropdownMenu.Label>Preset sizes</DropdownMenu.Label>
						<DropdownMenu.Separator />
						<DropdownMenu.RadioGroup bind:value={selectedPresetSize}>
							{#each [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as paperSize}
								<DropdownMenu.RadioItem value="a{paperSize}">A{paperSize}</DropdownMenu.RadioItem>
							{/each}
							<DropdownMenu.RadioItem value="letter">Letter</DropdownMenu.RadioItem>
							<DropdownMenu.RadioItem value="legal">Legal</DropdownMenu.RadioItem>
						</DropdownMenu.RadioGroup>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			</div>
			<Select.Root bind:selected={outputSizeUnit}>
				<Select.Trigger class="w-48" title="Unit">
					<Select.Value placeholder="Unit" />
				</Select.Trigger>
				<Select.Content>
					<Select.Group>
						<Select.Label>Unit</Select.Label>
						{#each outputSizeUnits as unit}
							<Select.Item value={unit.value} label={unit.label}>{unit.label}</Select.Item>
						{/each}
					</Select.Group>
				</Select.Content>
			</Select.Root>
		</div>
		<Progress class="mb-0.5 mt-1" title="Progress" value={progressPrecent} />
		{#if !processing}
			{#if !files?.length || !filesPreview?.length}
				<Tooltip.Root>
					<Tooltip.Trigger class="cursor-default">
						<Button class="w-full" on:click={mergeFiles} disabled>Merge and Download</Button>
					</Tooltip.Trigger>
					<Tooltip.Content>
						<p>Select one or more files to continue</p>
					</Tooltip.Content>
				</Tooltip.Root>
			{:else}
				<Button on:click={mergeFiles}>Merge and Download</Button>
			{/if}
		{:else}
			<Button disabled>
				<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
				Processing: {progressPrecent.toFixed(0)}%
			</Button>
		{/if}
		{#if downloadUrl}
			<a href={downloadUrl} class="h-fit w-full" download="output.pdf">
				<Button variant="secondary" class="w-full"><Download class="mr-2 h-4 w-4" />Download</Button
				>
			</a>
		{/if}
	</div>
	<div class="mx-4 mt-4 w-80">
		<h3 class="mt-1 text-base font-medium leading-none">Selected files</h3>
		<div class="mt-3 h-fit w-full rounded-md border">
			<SortableList
				bind:this={filesPreviewComponent}
				list={filesPreview}
				on:sort={sortFilesPreviewOnDrag}
				let:item
				let:index
			>
				<div class="m-0.5 flex items-center rounded-lg p-1.5 hover:bg-muted hover:bg-opacity-40">
					<Avatar.Root class="h-8 w-8">
						<Avatar.Fallback class="font-semibold">{index + 1}</Avatar.Fallback>
					</Avatar.Root>
					<p class="ml-2 w-52 overflow-hidden text-ellipsis text-nowrap">
						{item.name}
					</p>
					<DropdownMenu.Root>
						<DropdownMenu.Trigger>
							<Button variant="ghost" size="sm" class="ml-2 w-9 p-0">
								<EllipsisVertical class="h-4 w-4" />
							</Button>
						</DropdownMenu.Trigger>
						<DropdownMenu.Content>
							<DropdownMenu.Group>
								<DropdownMenu.Label>Modify</DropdownMenu.Label>
								<DropdownMenu.Separator />
								<DropdownMenu.Item
									class="cursor-pointer"
									data-from={index}
									data-to={index - 1}
									on:click={sortFilesPreviewOnClick}
									><ArrowUp class="mr-2 h-4 w-4" />Move up</DropdownMenu.Item
								>
								<DropdownMenu.Item
									class="cursor-pointer"
									data-from={index}
									data-to={index + 1}
									on:click={sortFilesPreviewOnClick}
									><ArrowDown class="mr-2 h-4 w-4" />Move down</DropdownMenu.Item
								>
								<DropdownMenu.Item
									class="cursor-pointer"
									data-from={index}
									data-to="0"
									on:click={sortFilesPreviewOnClick}
									><ArrowUpToLine class="mr-2 h-4 w-4" />Move to top</DropdownMenu.Item
								>
								<DropdownMenu.Item
									class="cursor-pointer"
									data-from={index}
									data-to={filesPreview.length - 1}
									on:click={sortFilesPreviewOnClick}
									><ArrowDownToLine class="mr-2 h-4 w-4" />Move to bottom</DropdownMenu.Item
								>
								<DropdownMenu.Item
									class="cursor-pointer"
									data-index={index}
									on:click={removeFilePreviewOnClick}
									><Trash2 class="mr-2 h-4 w-4" />Remove</DropdownMenu.Item
								>
							</DropdownMenu.Group>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				</div>
			</SortableList>
		</div>
	</div>
</div>
