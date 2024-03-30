<script lang="ts">
	// @hmr:keep-all

	import { Button } from '$lib/components/ui/button/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Progress } from '$lib/components/ui/progress';
	import * as Select from '$lib/components/ui/select/index.js';
	import Download from 'lucide-svelte/icons/download';
	import LoaderCircle from 'lucide-svelte/icons/loader-circle';
	import { PDFDocument } from 'pdf-lib';
	import { toast } from 'svelte-sonner';
	import SortableList from '$lib/components/ui/SortableList.svelte';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import ChevronsUpDown from 'lucide-svelte/icons/chevrons-up-down';
	import ArrowUp from 'lucide-svelte/icons/arrow-up';
	import ArrowDown from 'lucide-svelte/icons/arrow-down';
	import ArrowUpToLine from 'lucide-svelte/icons/arrow-up-to-line';
	import ArrowDownToLine from 'lucide-svelte/icons/arrow-down-to-line';
	import Trash2 from 'lucide-svelte/icons/trash-2';
	import EllipsisVertical from 'lucide-svelte/icons/ellipsis-vertical';

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

	function convertUnit(
		value: number,
		from: 'mm' | 'cm' | 'in' | 'pdf',
		to: 'mm' | 'cm' | 'in' | 'pdf'
	) {
		const units = {
			mm: 1,
			cm: 10,
			in: 25.4,
			pdf: 0.3527777777777
		};

		return (value * units[from]) / units[to];
	}

	$: scaleDimension, outputSizeUnit, selectedPresetSize, applyPresetSize();

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

	async function removePresetSize() {
		selectedPresetSize = '';
	}

	let files: FileList;
	let progressPrecent = 0;
	let processing = false;
	let downloadUrl: string = '';

	let filesPreview: Record<any, any>[] = [];

	function updateFilesPreview() {
		URL.revokeObjectURL(downloadUrl);
		downloadUrl = '';
		progressPrecent = 0;
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

	function sortFilesPreviewOnDrag(evnt: CustomEvent) {
		filesPreview = evnt.detail;
	}

	function sortFilesPreviewOnClick(evnt: CustomEvent) {
		// @ts-ignore
		const from = evnt.detail.currentTarget.dataset.from;
		// @ts-ignore
		const to = evnt.detail.currentTarget.dataset.to;
		filesPreviewComponent.reorder({ from, to });
	}

	function removeFilePreviewOnClick(evnt: CustomEvent) {
		// @ts-ignore
		const index = parseInt(evnt.detail.currentTarget.dataset.index);
		if (index < 0) return;
		if (index >= filesPreview.length) return;
		const newFilesPreview = [...filesPreview];
		newFilesPreview.splice(index, 1);
		filesPreview = newFilesPreview;
	}

	async function mergeFiles() {
		processing = true;
		URL.revokeObjectURL(downloadUrl);
		downloadUrl = '';
		progressPrecent = 0;

		if (!files?.length) {
			toast.error('No files selected', {
				description: 'Please select at least one file to merge'
			});
			processing = false;
			return;
		}

		const mergedPDF = await PDFDocument.create();

		let fileNumber = 0;

		for (let filePreviewData of filesPreview) {
			const fileIndex = parseInt(filePreviewData.id);

			const progressPrecentPerFile = 80 / files.length;

			const file = files[fileIndex];
			const fileData = await file.arrayBuffer();

			switch (file.type) {
				case 'image/png': {
					try {
						const image = await mergedPDF.embedPng(fileData);
						let width: number, height: number;
						if (scaleDimension.value === 'width') {
							width = convertUnit(
								outputSize,
								outputSizeUnit.value as 'mm' | 'cm' | 'in' | 'pdf',
								'pdf'
							);
							height = (image.height / image.width) * width;
						} else {
							height = convertUnit(
								outputSize,
								outputSizeUnit.value as 'mm' | 'cm' | 'in' | 'pdf',
								'pdf'
							);
							width = (image.width / image.height) * height;
						}
						const page = mergedPDF.addPage([width, height]);
						page.drawImage(image, {
							x: 0,
							y: 0,
							width: width,
							height: height
						});
					} catch (error) {
						toast.warning(`Failed to embed image: ${file.name}`, {
							description: 'Unknown error, this file was skipped'
						});
					}
					break;
				}

				case 'image/jpg':
				case 'image/jpeg': {
					try {
						const image = await mergedPDF.embedJpg(fileData);
						let width: number, height: number;
						if (scaleDimension.value === 'width') {
							width = convertUnit(
								outputSize,
								outputSizeUnit.value as 'mm' | 'cm' | 'in' | 'pdf',
								'pdf'
							);
							height = (image.height / image.width) * width;
						} else {
							height = convertUnit(
								outputSize,
								outputSizeUnit.value as 'mm' | 'cm' | 'in' | 'pdf',
								'pdf'
							);
							width = (image.width / image.height) * height;
						}
						const page = mergedPDF.addPage([width, height]);
						page.drawImage(image, {
							x: 0,
							y: 0,
							width: width,
							height: height
						});
					} catch (error) {
						toast.warning(`Failed to embed image: ${file.name}`, {
							description: 'Unknown error, this file was skipped'
						});
					}
					break;
				}

				case 'application/pdf':
					try {
						const pdf = await PDFDocument.load(fileData);
						const copiedPages = await mergedPDF.copyPages(pdf, pdf.getPageIndices());
						const pageCount = copiedPages.length;
						for (let [pageIndex, page] of copiedPages.entries()) {
							if (scaleType.value === 'all') {
								let scaleFactor: number;
								if (scaleDimension.value === 'width') {
									scaleFactor =
										convertUnit(
											outputSize,
											outputSizeUnit.value as 'mm' | 'cm' | 'in' | 'pdf',
											'pdf'
										) / page.getWidth();
								} else {
									scaleFactor =
										convertUnit(
											outputSize,
											outputSizeUnit.value as 'mm' | 'cm' | 'in' | 'pdf',
											'pdf'
										) / page.getHeight();
								}
								page.scale(scaleFactor, scaleFactor);
							}
							mergedPDF.addPage(page);
							progressPrecent =
								fileNumber * progressPrecentPerFile +
								((pageIndex + 1) * progressPrecentPerFile) / pageCount;
						}
					} catch (error) {
						toast.warning(`Failed to load PDF: ${file.name}`, {
							description:
								error instanceof Error && error.message.includes('is encrypted')
									? 'Document is encrypted, this file was skipped'
									: 'Unknown error, this file was skipped'
						});
					}
					break;

				default:
					toast.warning(`Unsupported file type: ${file.name}`, {
						description: `File type ${file.type} is not supported, this file was skipped`
					});
					break;
			}

			progressPrecent = (fileNumber + 1) * progressPrecentPerFile;

			fileNumber++;
		}

		if (mergedPDF.getPageCount() === 0) {
			toast.error('Empty output', {
				description: 'Output is empty because all files failed to be merged'
			});
			progressPrecent = 100;
			processing = false;
			return;
		}
		const mergedPdf = await mergedPDF.save();
		const mergedPdfBlob = new Blob([mergedPdf], { type: 'application/pdf' });
		downloadUrl = URL.createObjectURL(mergedPdfBlob);
		toast.success('Processing completed!', {
			description:
				'Your file should begin downloading automatically. If not, click the download button'
		});
		const a = document.createElement('a');
		a.href = downloadUrl;
		a.download = 'output.pdf';
		a.click();

		progressPrecent = 100;
		processing = false;
	}

	$: smallScreen = innerWidth < 640;
	$: largeScreen = innerWidth >= 640;
</script>

<svelte:head>
	<title>Merge/Convert to PDF</title>
</svelte:head>

<div class="flex flex-wrap w-full justify-center">
	<div class="grid w-[22rem] h-fit items-center gap-1.5 mt-4 px-4">
		<h1 class="text-xl font-semibold">Merge/Convert</h1>
		<hr />
		<h2 class="mb-1">Merge PDF or image files into one PDF file</h2>
		<Label for="input-files">Input files</Label>
		<input
			id="input-files"
			class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
			type="file"
			accept="application/pdf,image/png,image/jpg,image/jpeg"
			multiple
			bind:files
			on:change={updateFilesPreview}
		/>
		<div class="flex justify-between">
			<div>
				<Label for="scale-type">Scale</Label>
				<Select.Root bind:selected={scaleType}>
					<Select.Trigger class="w-36">
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
					<Select.Input name="scale-type" />
				</Select.Root>
			</div>
			<div>
				<Label for="scale-dimension">Dimension</Label>
				<Select.Root bind:selected={scaleDimension}>
					<Select.Trigger class="w-40">
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
					<Select.Input name="scale-dimension" />
				</Select.Root>
			</div>
		</div>
		<Label for="output-size">Output {scaleDimension.label.toLowerCase()}</Label>
		<div class="flex">
			<div
				class="flex h-10 mr-2 rounded-md border border-input bg-background text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
			>
				<Input
					type="number"
					id="output-size"
					class="border-0 h-[2.375rem] mr-1"
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
				<Select.Trigger class="w-48">
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
				<Select.Input name="scale-unit" />
			</Select.Root>
		</div>
		<Progress class="mt-1 mb-0.5" value={progressPrecent} />
		{#if !processing}
			<Button on:click={mergeFiles}>Merge and Download</Button>
		{:else}
			<Button disabled>
				<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
				Processing: {progressPrecent.toFixed(0)}%
			</Button>
		{/if}
		{#if downloadUrl}
			<a href={downloadUrl} class="w-full h-fit" download="output.pdf">
				<Button variant="secondary" class="w-full"><Download class="mr-2 h-4 w-4" />Download</Button
				>
			</a>
		{/if}
	</div>
	<div class="w-80 mx-4 mt-4">
		<Label class="text-base">Selected files</Label>
		<div class="w-full h-fit rounded-md border mt-2">
			<SortableList
				bind:this={filesPreviewComponent}
				list={filesPreview}
				on:sort={sortFilesPreviewOnDrag}
				let:item
				let:index
			>
				<div class="flex items-center hover:bg-muted hover:bg-opacity-40 rounded-lg p-1.5 m-0.5">
					<Avatar.Root class="w-8 h-8">
						<Avatar.Fallback class="font-semibold">{index + 1}</Avatar.Fallback>
					</Avatar.Root>
					<p class="overflow-hidden text-nowrap text-ellipsis w-52 ml-2">
						{item.name}
					</p>
					<DropdownMenu.Root>
						<DropdownMenu.Trigger>
							<Button variant="ghost" size="sm" class="w-9 p-0 ml-2">
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
