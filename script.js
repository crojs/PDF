(function() {
    'use strict';

    // DOM সম্পূর্ণ লোড হওয়ার পরে স্ক্রিপ্ট চালু হবে
    document.addEventListener('DOMContentLoaded', function() {

        // ── Helper: নিরাপদভাবে element খোঁজা ──
        function getElement(id) {
            var el = document.getElementById(id);
            if (!el) {
                console.warn('Element not found: #' + id);
            }
            return el;
        }

        // ── DOM elements (সবগুলো null-check সহ) ──
        var uploadZone = getElement('uploadZone');
        var fileInput = getElement('fileInput');
        var fileGridSection = getElement('fileGridSection');
        var fileGrid = getElement('fileGrid');
        var fileCount = getElement('fileCount');
        var convertBtn = getElement('convertBtn');
        var clearAllBtn = getElement('clearAllBtn');
        var addMoreBtn = getElement('addMoreBtn');
        var processingOverlay = getElement('processingOverlay');
        var statusText = getElement('statusText');
        var progressBar = getElement('progressBar');
        var progressLabel = getElement('progressLabel');
        var resultSection = getElement('resultSection');
        var resultCount = getElement('resultCount');
        var downloadBtn = getElement('downloadBtn');
        var resetBtn = getElement('resetBtn');

        // কোনো অপরিহার্য element না থাকলে স্ক্রিপ্ট বন্ধ
        if (!uploadZone || !fileInput || !fileGridSection || !fileGrid || !convertBtn || !processingOverlay || !downloadBtn) {
            console.error('Required DOM elements are missing. Check HTML IDs.');
            return;
        }

        // ── State ──
        var fileItems = [];
        var pdfBlob = null;
        var isProcessing = false;
        var fileLoadGeneration = 0;
        var hintTimeout = null;

        function getHintElement() {
            return document.querySelector('.upload-zone .hint');
        }

        function updateUI() {
            var count = fileItems.length;
            fileCount.textContent = count;
            if (count === 0) {
                fileGridSection.classList.remove('visible');
                resultSection.classList.remove('visible');
                uploadZone.style.display = 'block';
            } else {
                fileGridSection.classList.add('visible');
                uploadZone.style.display = 'none';
            }
            convertBtn.disabled = (count === 0 || isProcessing);
            renderGrid();
        }

        function renderGrid() {
            fileGrid.innerHTML = '';
            fileItems.forEach(function(item, index) {
                var card = document.createElement('div');
                card.className = 'image-card';

                if (item.kind === 'image') {
                    var img = document.createElement('img');
                    img.src = item.dataURL || '';
                    img.alt = 'Image ' + (index + 1) + ': ' + item.file.name;
                    img.loading = 'lazy';
                    card.appendChild(img);
                } else {
                    var placeholder = document.createElement('div');
                    placeholder.className = 'file-icon-placeholder';
                    placeholder.innerHTML = (item.kind === 'pdf') ? '<i class="fa-regular fa-file-pdf"></i>' : '<i class="fa-regular fa-file-lines"></i>';
                    card.appendChild(placeholder);
                }

                var removeBtn = document.createElement('button');
                removeBtn.className = 'remove-btn';
                removeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
                removeBtn.setAttribute('aria-label', 'Remove file ' + (index + 1));
                removeBtn.type = 'button';
                (function(idx) {
                    removeBtn.addEventListener('click', function(e) {
                        e.stopPropagation();
                        removeFile(idx);
                    });
                })(index);

                var badge = document.createElement('span');
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

        function getFileKind(file) {
            if (file.type.indexOf('image/') === 0) return 'image';
            if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) return 'pdf';
            if (file.type.indexOf('text/') === 0 || /\.(txt|text|md|csv)$/i.test(file.name)) return 'text';
            return 'image';
        }

        function showUploadMessage(msg, duration) {
            duration = duration || 3000;
            var hintEl = getHintElement();
            if (!hintEl) return;
            if (hintTimeout) clearTimeout(hintTimeout);
            var original = hintEl.innerHTML;
            hintEl.innerHTML = '<i class="fa-regular fa-triangle-exclamation"></i> ' + msg;
            hintTimeout = setTimeout(function() {
                hintEl.innerHTML = original;
                hintTimeout = null;
            }, duration);
        }

        function loadFiles(files) {
            var validFiles = Array.prototype.filter.call(files, function(f) {
                var kind = getFileKind(f);
                return kind === 'image' || kind === 'text' || kind === 'pdf';
            });
            if (validFiles.length === 0) {
                showUploadMessage('Please select supported file types (images, text, PDF).');
                return;
            }

            var generation = ++fileLoadGeneration;
            var loaded = 0;
            var total = validFiles.length;

            validFiles.forEach(function(file) {
                var kind = getFileKind(file);
                if (kind === 'image') {
                    var reader = new FileReader();
                    reader.onload = function(e) {
                        if (generation !== fileLoadGeneration) return;
                        fileItems.push({ file: file, kind: kind, dataURL: e.target.result });
                        loaded++;
                        if (loaded === total) finalizeLoad();
                    };
                    reader.onerror = function() {
                        if (generation !== fileLoadGeneration) return;
                        loaded++;
                        if (loaded === total) finalizeLoad();
                    };
                    reader.readAsDataURL(file);
                } else if (kind === 'text') {
                    var reader = new FileReader();
                    reader.onload = function(e) {
                        if (generation !== fileLoadGeneration) return;
                        fileItems.push({ file: file, kind: kind, textContent: e.target.result });
                        loaded++;
                        if (loaded === total) finalizeLoad();
                    };
                    reader.onerror = function() {
                        if (generation !== fileLoadGeneration) return;
                        loaded++;
                        if (loaded === total) finalizeLoad();
                    };
                    reader.readAsText(file);
                } else {
                    fileItems.push({ file: file, kind: kind });
                    loaded++;
                    if (loaded === total) finalizeLoad();
                }
            });

            function finalizeLoad() {
                updateUI();
                fileGridSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }

        fileInput.addEventListener('change', function(e) {
            if (e.target.files.length) loadFiles(e.target.files);
            fileInput.value = '';
        });

        uploadZone.addEventListener('click', function() { fileInput.click(); });
        uploadZone.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInput.click();
            }
        });

        uploadZone.addEventListener('dragover', function(e) {
            e.preventDefault();
            uploadZone.classList.add('dragover');
        });
        uploadZone.addEventListener('dragleave', function(e) {
            e.preventDefault();
            uploadZone.classList.remove('dragover');
        });
        uploadZone.addEventListener('drop', function(e) {
            e.preventDefault();
            uploadZone.classList.remove('dragover');
            if (e.dataTransfer.files.length) loadFiles(e.dataTransfer.files);
        });

        addMoreBtn.addEventListener('click', function() { fileInput.click(); });
        clearAllBtn.addEventListener('click', clearAll);
        convertBtn.addEventListener('click', startConversion);

        function loadImage(dataURL) {
            return new Promise(function(resolve, reject) {
                var img = new Image();
                img.onload = function() { resolve(img); };
                img.onerror = function() { reject(new Error('Failed to load image')); };
                img.src = dataURL;
            });
        }

        var pdfjsLibPromise = null;
        function loadPdfJs() {
            if (!pdfjsLibPromise) {
                pdfjsLibPromise = new Promise(function(resolve, reject) {
                    var script = document.createElement('script');
                    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
                    script.onload = function() {
                        if (window.pdfjsLib) {
                            window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                            resolve(window.pdfjsLib);
                        } else {
                            reject(new Error('PDF.js failed to load'));
                        }
                    };
                    script.onerror = function() { reject(new Error('PDF.js failed to load')); };
                    document.head.appendChild(script);
                });
            }
            return pdfjsLibPromise;
        }

        async function renderPdfToImages(file) {
            var pdfjs = await loadPdfJs();
            var arrayBuffer = await file.arrayBuffer();
            var pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
            var images = [];
            for (var pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                var page = await pdf.getPage(pageNum);
                var viewport = page.getViewport({ scale: 2 });
                var canvas = document.createElement('canvas');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                var ctx = canvas.getContext('2d');
                await page.render({ canvasContext: ctx, viewport: viewport }).promise;

                var img = new Image();
                img.src = canvas.toDataURL('image/jpeg', 0.9);
                await new Promise(function(resolve, reject) {
                    img.onload = resolve;
                    img.onerror = function() { reject(new Error('Failed to convert PDF page to image')); };
                });
                images.push(img);
            }
            return images;
        }

        async function startConversion() {
            if (isProcessing || fileItems.length === 0) return;
            isProcessing = true;
            convertBtn.disabled = true;
            processingOverlay.classList.add('active');
            progressBar.style.width = '0%';
            progressLabel.textContent = '0%';
            statusText.textContent = 'Preparing…';

            try {
                if (!window.jspdf || !window.jspdf.jsPDF) {
                    throw new Error('PDF library not loaded. Please check your internet connection and refresh.');
                }

                var jsPDF = window.jspdf.jsPDF;
                var pdf = new jsPDF('p', 'mm', 'a4');
                var pageWidth = pdf.internal.pageSize.getWidth();
                var pageHeight = pdf.internal.pageSize.getHeight();
                var pageAdded = false;

                var totalFiles = fileItems.length;
                var hasPDF = fileItems.some(function(item) { return item.kind === 'pdf'; });
                if (hasPDF) {
                    statusText.textContent = 'Loading PDF renderer…';
                    await loadPdfJs();
                }

                for (var i = 0; i < totalFiles; i++) {
                    var item = fileItems[i];
                    if (item.kind === 'image') {
                        statusText.textContent = 'Processing image ' + (i + 1) + '/' + totalFiles + '…';
                        var img = await loadImage(item.dataURL);
                        var imgWidth = img.naturalWidth || img.width;
                        var imgHeight = img.naturalHeight || img.height;
                        var ratio = Math.min(pageWidth / imgWidth, pageHeight / imgHeight);
                        var w = imgWidth * ratio;
                        var h = imgHeight * ratio;
                        var x = (pageWidth - w) / 2;
                        var y = (pageHeight - h) / 2;

                        if (pageAdded) pdf.addPage();
                        pageAdded = true;

                        var canvas = document.createElement('canvas');
                        canvas.width = imgWidth;
                        canvas.height = imgHeight;
                        var ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0);
                        var dataUrl = canvas.toDataURL('image/jpeg', 0.92);
                        pdf.addImage(dataUrl, 'JPEG', x, y, w, h);
                    }
                    else if (item.kind === 'text') {
                        statusText.textContent = 'Adding text file ' + (i + 1) + '/' + totalFiles + '…';
                        var text = item.textContent || '';
                        if (text.trim().length > 0) {
                            if (pageAdded) pdf.addPage();
                            pageAdded = true;

                            var margin = 15;
                            var usableWidth = pageWidth - margin * 2;
                            var fontSize = 12;
                            var lineHeight = 7;
                            var linesPerPage = Math.floor((pageHeight - margin * 2) / lineHeight);
                            var lines = pdf.splitTextToSize(text, usableWidth);

                            var lineIndex = 0;
                            var currentPage = 0;
                            while (lineIndex < lines.length) {
                                if (currentPage > 0) {
                                    pdf.addPage();
                                    pageAdded = true;
                                }
                                var linesToAdd = lines.slice(lineIndex, lineIndex + linesPerPage);
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
                        statusText.textContent = 'Rendering PDF ' + (i + 1) + '/' + totalFiles + '…';
                        var pages = await renderPdfToImages(item.file);
                        for (var p = 0; p < pages.length; p++) {
                            if (pageAdded) pdf.addPage();
                            pageAdded = true;
                            var pageImg = pages[p];
                            var pImgWidth = pageImg.naturalWidth || pageImg.width;
                            var pImgHeight = pageImg.naturalHeight || pageImg.height;
                            var pRatio = Math.min(pageWidth / pImgWidth, pageHeight / pImgHeight);
                            var pW = pImgWidth * pRatio;
                            var pH = pImgHeight * pRatio;
                            var pX = (pageWidth - pW) / 2;
                            var pY = (pageHeight - pH) / 2;
                            var pDataUrl = pageImg.toDataURL('image/jpeg', 0.85);
                            pdf.addImage(pDataUrl, 'JPEG', pX, pY, pW, pH);
                        }
                    }

                    var pct = Math.round(((i + 1) / totalFiles) * 100);
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

                setTimeout(function() {
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
                setTimeout(function() {
                    processingOverlay.classList.remove('active');
                    isProcessing = false;
                    convertBtn.disabled = false;
                }, 2000);
            }
        }

        // ── Download button: direct download (improved) ──
        downloadBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (!pdfBlob) {
                console.warn('No PDF blob available.');
                return;
            }

            var blobUrl = URL.createObjectURL(pdfBlob);
            var link = document.createElement('a');
            link.href = blobUrl;
            link.download = 'onpdf-converted.pdf';
            link.rel = 'noopener';
            link.style.display = 'none';
            link.target = '_blank';

            document.body.appendChild(link);
            link.click();

            setTimeout(function() {
                document.body.removeChild(link);
                URL.revokeObjectURL(blobUrl);
            }, 2000);
        });

        resetBtn.addEventListener('click', function() {
            resultSection.classList.remove('visible');
            pdfBlob = null;
            fileGridSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && processingOverlay.classList.contains('active') && !isProcessing) {
                processingOverlay.classList.remove('active');
            }
        });

        // Initialize
        updateUI();

    });
})();