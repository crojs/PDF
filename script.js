(function() {
    'use strict';

    // DOM সম্পূর্ণ লোড হওয়ার পরেই স্ক্রিপ্ট চালানো হবে
    document.addEventListener('DOMContentLoaded', function() {

        // ── DOM refs ──
        const uploadZone = document.getElementById('uploadZone');
        const fileInput = document.getElementById('fileInput');
        const fileGridSection = document.getElementById('fileGridSection');
        const fileGrid = document.getElementById('fileGrid');
        const fileCount = document.getElementById('fileCount');
        const convertBtn = document.getElementById('convertBtn');
        const clearAllBtn = document.getElementById('clearAllBtn');
        const addMoreBtn = document.getElementById('addMoreBtn');
        const processingOverlay = document.getElementById('processingOverlay');
        const statusText = document.getElementById('statusText');
        const progressBar = document.getElementById('progressBar');
        const progressLabel = document.getElementById('progressLabel');
        const resultSection = document.getElementById('resultSection');
        const resultCount = document.getElementById('resultCount');
        const downloadBtn = document.getElementById('downloadBtn');
        const resetBtn = document.getElementById('resetBtn');
        
        // hint এলিমেন্টটি নিরাপদে পাওয়ার জন্য আলাদা ফাংশন
        function getHintElement() {
            return document.querySelector('.upload-zone .hint');
        }

        // ── State ──
        let fileItems = [];
        let pdfBlob = null;
        let isProcessing = false;
        let fileLoadGeneration = 0;
        let hintTimeout = null;

        // ── Helpers ──
        function updateUI() {
            const count = fileItems.length;
            fileCount.textContent = count;
            if (count === 0) {
                fileGridSection.classList.remove('visible');
                resultSection.classList.remove('visible');
                uploadZone.style.display = 'block';
            } else {
                fileGridSection.classList.add('visible');
                uploadZone.style.display = 'none';
            }
            convertBtn.disabled = count === 0 || isProcessing;
            renderGrid();
        }

        function renderGrid() {
            fileGrid.innerHTML = '';
            fileItems.forEach((item, index) => {
                const card = document.createElement('div');
                card.className = 'image-card';

                if (item.kind === 'image') {
                    const img = document.createElement('img');
                    img.src = item.dataURL || '';
                    img.alt = 'Image ' + (index + 1) + ': ' + item.file.name;
                    img.loading = 'lazy';
                    card.appendChild(img);
                } else {
                    const placeholder = document.createElement('div');
                    placeholder.className = 'file-icon-placeholder';
                    placeholder.innerHTML = item.kind === 'pdf' ? '<i class="fa-regular fa-file-pdf"></i>' : '<i class="fa-regular fa-file-lines"></i>';
                    card.appendChild(placeholder);
                }

                const removeBtn = document.createElement('button');
                removeBtn.className = 'remove-btn';
                removeBtn.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';
                removeBtn.setAttribute('aria-label', 'Remove file ' + (index + 1));
                removeBtn.setAttribute('type', 'button');
                removeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    removeFile(index);
                });

                const badge = document.createElement('span');
                badge.className = 'order-badge';
                badge.textContent = '#' + (index + 1);

                card.appendChild(removeBtn);
                card.appendChild(badge);
                fileGrid.appendChild(card);
            });
        }

        function removeFile(index) {
            fileItems.splice(index, 1);
            updateUI();
            resultSection.classList.remove('visible');
            pdfBlob = null;
        }

        function clearAll() {
            fileLoadGeneration++;
            fileItems = [];
            pdfBlob = null;
            resultSection.classList.remove('visible');
            updateUI();
        }

        // ── Determine file kind ──
        function getFileKind(file) {
            if (file.type.startsWith('image/')) return 'image';
            if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) return 'pdf';
            if (file.type.startsWith('text/') || /\.(txt|text|md|csv)$/i.test(file.name)) return 'text';
            return 'image';
        }

        // ── Show temporary message in upload zone ──
        function showUploadMessage(msg, duration = 3000) {
            const hintEl = getHintElement();
            if (!hintEl) return; // hint এলিমেন্ট না থাকলে কিছু করবে না

            if (hintTimeout) clearTimeout(hintTimeout);
            const originalText = hintEl.innerHTML;
            hintEl.innerHTML = '<i class="fa-regular fa-triangle-exclamation"></i> ' + msg;
            hintTimeout = setTimeout(() => {
                hintEl.innerHTML = originalText;
                hintTimeout = null;
            }, duration);
        }

        // ── Load files ──
        function loadFiles(files) {
            const validFiles = Array.from(files).filter(f => {
                const kind = getFileKind(f);
                return kind === 'image' || kind === 'text' || kind === 'pdf';
            });

            if (validFiles.length === 0) {
                showUploadMessage('Please select supported file types (images, text, PDF).');
                return;
            }

            const generation = ++fileLoadGeneration;
            let loaded = 0;
            const total = validFiles.length;

            validFiles.forEach((file) => {
                const kind = getFileKind(file);
                if (kind === 'image') {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        if (generation !== fileLoadGeneration) return;
                        fileItems.push({ file, kind, dataURL: e.target.result });
                        loaded++;
                        if (loaded === total) finalizeLoad();
                    };
                    reader.onerror = () => {
                        if (generation !== fileLoadGeneration) return;
                        loaded++;
                        if (loaded === total) finalizeLoad();
                    };
                    reader.readAsDataURL(file);
                } else if (kind === 'text') {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        if (generation !== fileLoadGeneration) return;
                        fileItems.push({ file, kind, textContent: e.target.result });
                        loaded++;
                        if (loaded === total) finalizeLoad();
                    };
                    reader.onerror = () => {
                        if (generation !== fileLoadGeneration) return;
                        loaded++;
                        if (loaded === total) finalizeLoad();
                    };
                    reader.readAsText(file);
                } else { // pdf
                    fileItems.push({ file, kind });
                    loaded++;
                    if (loaded === total) finalizeLoad();
                }
            });

            function finalizeLoad() {
                updateUI();
                fileGridSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }

        // ── File input handler ──
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length) loadFiles(e.target.files);
            fileInput.value = '';
        });

        // ── Upload zone click & keyboard ──
        uploadZone.addEventListener('click', () => fileInput.click());
        uploadZone.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInput.click();
            }
        });

        // ── Drag & Drop ──
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('dragover');
        });
        uploadZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('dragover');
        });
        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('dragover');
            if (e.dataTransfer.files.length) loadFiles(e.dataTransfer.files);
        });

        // ── Add more ──
        addMoreBtn.addEventListener('click', () => fileInput.click());

        // ── Clear all ──
        clearAllBtn.addEventListener('click', clearAll);

        // ── Convert ──
        convertBtn.addEventListener('click', startConversion);

        async function startConversion() {
            if (isProcessing || fileItems.length === 0) return;
            isProcessing = true;
            convertBtn.disabled = true;
            processingOverlay.classList.add('active');
            progressBar.style.width = '0%';
            progressLabel.textContent = '0%';
            statusText.textContent = 'Preparing…';

            try {
                const { jsPDF } = window.jspdf;
                const pdf = new jsPDF('p', 'mm', 'a4');
                const pageWidth = pdf.internal.pageSize.getWidth();
                const pageHeight = pdf.internal.pageSize.getHeight();
                let pageAdded = false;

                const totalFiles = fileItems.length;
                const hasPDF = fileItems.some(item => item.kind === 'pdf');
                if (hasPDF) {
                    statusText.textContent = 'Loading PDF renderer…';
                    await loadPdfJs();
                }

                for (let i = 0; i < totalFiles; i++) {
                    const item = fileItems[i];

                    if (item.kind === 'image') {
                        statusText.textContent = `Processing image ${i+1}/${totalFiles}…`;
                        const img = await loadImage(item.dataURL);
                        const imgWidth = img.naturalWidth || img.width;
                        const imgHeight = img.naturalHeight || img.height;
                        const ratio = Math.min(pageWidth / imgWidth, pageHeight / imgHeight);
                        const w = imgWidth * ratio;
                        const h = imgHeight * ratio;
                        const x = (pageWidth - w) / 2;
                        const y = (pageHeight - h) / 2;

                        if (pageAdded) pdf.addPage();
                        pageAdded = true;

                        const canvas = document.createElement('canvas');
                        canvas.width = imgWidth;
                        canvas.height = imgHeight;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0);
                        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
                        pdf.addImage(dataUrl, 'JPEG', x, y, w, h);
                    }
                    else if (item.kind === 'text') {
                        statusText.textContent = `Adding text file ${i+1}/${totalFiles}…`;
                        const text = item.textContent || '';
                        if (text.trim().length > 0) {
                            if (pageAdded) pdf.addPage();
                            pageAdded = true;

                            const margin = 15;
                            const usableWidth = pageWidth - margin * 2;
                            const fontSize = 12;
                            const lineHeight = 7;
                            const linesPerPage = Math.floor((pageHeight - margin * 2) / lineHeight);
                            const lines = pdf.splitTextToSize(text, usableWidth);

                            let lineIndex = 0;
                            let currentPage = 0;
                            while (lineIndex < lines.length) {
                                if (currentPage > 0) {
                                    pdf.addPage();
                                    pageAdded = true;
                                }
                                const linesToAdd = lines.slice(lineIndex, lineIndex + linesPerPage);
                                pdf.setFontSize(fontSize);
                                pdf.text(linesToAdd, margin, margin, { baseline: 'top' });
                                lineIndex += linesPerPage;
                                currentPage++;
                            }
                        } else {
                            if (pageAdded) pdf.addPage();
                            pageAdded = true;
                        }
                    }
                    else if (item.kind === 'pdf') {
                        statusText.textContent = `Rendering PDF ${i+1}/${totalFiles}…`;
                        const pages = await renderPdfToImages(item.file);
                        for (let p = 0; p < pages.length; p++) {
                            if (pageAdded) pdf.addPage();
                            pageAdded = true;
                            const img = pages[p];
                            const imgWidth = img.naturalWidth || img.width;
                            const imgHeight = img.naturalHeight || img.height;
                            const ratio = Math.min(pageWidth / imgWidth, pageHeight / imgHeight);
                            const w = imgWidth * ratio;
                            const h = imgHeight * ratio;
                            const x = (pageWidth - w) / 2;
                            const y = (pageHeight - h) / 2;
                            const dataUrl = img.toDataURL('image/jpeg', 0.85);
                            pdf.addImage(dataUrl, 'JPEG', x, y, w, h);
                        }
                    }

                    const pct = Math.round(((i + 1) / totalFiles) * 100);
                    progressBar.style.width = pct + '%';
                    progressLabel.textContent = pct + '%';
                }

                statusText.textContent = 'Finalizing PDF…';
                progressBar.style.width = '98%';
                progressLabel.textContent = '98%';
                pdfBlob = pdf.output('blob');
                progressBar.style.width = '100%';
                progressLabel.textContent = '100%';
                statusText.textContent = '✅ Done!';

                setTimeout(() => {
                    processingOverlay.classList.remove('active');
                    resultCount.textContent = totalFiles;
                    resultSection.classList.add('visible');
                    resultSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    isProcessing = false;
                    convertBtn.disabled = false;
                }, 400);

            } catch (err) {
                console.error('Conversion error:', err);
                statusText.textContent = '❌ Error: ' + (err.message || 'Something went wrong');
                progressBar.style.width = '0%';
                progressLabel.textContent = 'Error';
                setTimeout(() => {
                    processingOverlay.classList.remove('active');
                    isProcessing = false;
                    convertBtn.disabled = false;
                }, 2000);
            }
        }

        function loadImage(dataURL) {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = () => reject(new Error('Failed to load image'));
                img.src = dataURL;
            });
        }

        // ── pdf.js dynamic loader ──
        let pdfjsLibPromise = null;
        function loadPdfJs() {
            if (!pdfjsLibPromise) {
                pdfjsLibPromise = new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
                    script.onload = () => {
                        if (window.pdfjsLib) {
                            window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                            resolve(window.pdfjsLib);
                        } else {
                            reject(new Error('PDF.js failed to load'));
                        }
                    };
                    script.onerror = () => reject(new Error('PDF.js failed to load'));
                    document.head.appendChild(script);
                });
            }
            return pdfjsLibPromise;
        }

        async function renderPdfToImages(file) {
            const pdfjs = await loadPdfJs();
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
            const images = [];
            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                const viewport = page.getViewport({ scale: 2 });
                const canvas = document.createElement('canvas');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                const ctx = canvas.getContext('2d');
                await page.render({ canvasContext: ctx, viewport }).promise;

                const img = new Image();
                img.src = canvas.toDataURL('image/jpeg', 0.9);
                await new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = () => reject(new Error('Failed to convert PDF page to image'));
                });
                images.push(img);
            }
            return images;
        }

        // ── Download ──
        downloadBtn.addEventListener('click', () => {
            if (!pdfBlob) return;
            const link = document.createElement('a');
            link.href = URL.createObjectURL(pdfBlob);
            link.download = 'onpdf-converted.pdf';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(link.href), 5000);
        });

        // ── Reset ──
        resetBtn.addEventListener('click', () => {
            resultSection.classList.remove('visible');
            pdfBlob = null;
            fileGridSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });

        // ── Escape key ──
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && processingOverlay.classList.contains('active') && !isProcessing) {
                processingOverlay.classList.remove('active');
            }
        });

        // ── Init ──
        updateUI();

    }); // end DOMContentLoaded

})();