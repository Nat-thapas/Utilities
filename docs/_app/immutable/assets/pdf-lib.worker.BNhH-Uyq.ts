import { PDFDocument } from 'pdf-lib';

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

async function mergePdf(
	files: FileList,
	filesPreview: Record<string, string>[],
	scaleType: 'all' | 'none',
	scaleDimension: 'width' | 'height',
	outputSize: number,
	outputSizeUnit: 'mm' | 'cm' | 'in' | 'pdf'
) {
	postMessage({ type: 'progress', data: 0 });

	const mergedPDF = await PDFDocument.create();

	let fileNumber = 0;

	for (let filePreviewData of filesPreview) {
		const fileIndex = parseInt(filePreviewData.id);

		if (fileIndex < 0 || fileIndex >= files.length) {
			postMessage({
				type: 'warning',
				data: {
					message: `Invalid file index: ${fileIndex}`,
					description: 'File index is out of range, this file was skipped'
				}
			});
			continue;
		}

		const progressPrecentPerFile = 80 / filesPreview.length;

		const file = files[fileIndex];
		const fileData = await file.arrayBuffer();

		switch (file.type) {
			case 'image/png': {
				try {
					const image = await mergedPDF.embedPng(fileData);
					let width: number, height: number;
					if (scaleDimension === 'width') {
						width = convertUnit(outputSize, outputSizeUnit as 'mm' | 'cm' | 'in' | 'pdf', 'pdf');
						height = (image.height / image.width) * width;
					} else {
						height = convertUnit(outputSize, outputSizeUnit as 'mm' | 'cm' | 'in' | 'pdf', 'pdf');
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
					postMessage({
						type: 'warning',
						data: {
							message: `Failed to embed image: ${file.name}`,
							description: 'Unknown error, this file was skipped'
						}
					});
				}
				break;
			}

			case 'image/jpg':
			case 'image/jpeg': {
				try {
					const image = await mergedPDF.embedJpg(fileData);
					let width: number, height: number;
					if (scaleDimension === 'width') {
						width = convertUnit(outputSize, outputSizeUnit as 'mm' | 'cm' | 'in' | 'pdf', 'pdf');
						height = (image.height / image.width) * width;
					} else {
						height = convertUnit(outputSize, outputSizeUnit as 'mm' | 'cm' | 'in' | 'pdf', 'pdf');
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
					postMessage({
						type: 'warning',
						data: {
							message: `Failed to embed image: ${file.name}`,
							description: 'Unknown error, this file was skipped'
						}
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
						if (scaleType === 'all') {
							let scaleFactor: number;
							if (scaleDimension === 'width') {
								scaleFactor =
									convertUnit(outputSize, outputSizeUnit as 'mm' | 'cm' | 'in' | 'pdf', 'pdf') /
									page.getWidth();
							} else {
								scaleFactor =
									convertUnit(outputSize, outputSizeUnit as 'mm' | 'cm' | 'in' | 'pdf', 'pdf') /
									page.getHeight();
							}
							page.scale(scaleFactor, scaleFactor);
						}
						mergedPDF.addPage(page);
						const progressPrecent =
							fileNumber * progressPrecentPerFile +
							((pageIndex + 1) * progressPrecentPerFile) / pageCount;
						postMessage({ type: 'progress', data: progressPrecent });
					}
				} catch (error) {
					const errorDescription =
						error instanceof Error && error.message.includes('is encrypted')
							? 'Document is encrypted, this file was skipped'
							: 'Unknown error, this file was skipped';
					postMessage({
						type: 'warning',
						data: { message: `Failed to load PDF: ${file.name}`, description: errorDescription }
					});
				}
				break;

			default:
				postMessage({
					type: 'warning',
					data: {
						message: `Unsupported file type: ${file.name}`,
						description: `File type ${file.type} is not supported, this file was skipped`
					}
				});
				break;
		}

		const progressPrecent = (fileNumber + 1) * progressPrecentPerFile;
		postMessage({ type: 'progress', data: progressPrecent });

		fileNumber++;
	}

	if (mergedPDF.getPageCount() === 0) {
		postMessage({
			type: 'error',
			data: {
				message: 'Empty output',
				description: 'Output is empty because all files failed to be merged'
			}
		});
		return;
	}

	const mergedPdf = await mergedPDF.save();
	const mergedPdfBlob = new Blob([mergedPdf], { type: 'application/pdf' });
	postMessage({ type: 'progress', data: 100 });
	postMessage({ type: 'success', data: mergedPdfBlob });
}

onmessage = (event) => {
	const { type, files, filesPreview, scaleType, scaleDimension, outputSize, outputSizeUnit } =
		event.data;
	switch (type) {
		case 'merge':
			mergePdf(files, filesPreview, scaleType, scaleDimension, outputSize, outputSizeUnit);
			break;
		default:
			postMessage({
				type: 'error',
				data: {
					message: 'Invalid message type',
					description: 'Received an invalid message type'
				}
			});
			break;
	}
};
