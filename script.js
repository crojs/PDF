(function() {
    'use strict';

    // ডাইনামিক বছর
    document.querySelectorAll('.dynamic-year').forEach(el => el.textContent = new Date().getFullYear());

    // মোবাইল নেভিগেশন টগল (সব পেজে কাজ করবে)
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');
    if (navToggle && navLinks) {
        navToggle.addEventListener('click', () => {
            const isOpen = navLinks.classList.toggle('open');
            navToggle.classList.toggle('active', isOpen);
            navToggle.setAttribute('aria-expanded', isOpen);
        });

        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('open');
                navToggle.classList.remove('active');
                navToggle.setAttribute('aria-expanded', 'false');
            });
        });

        document.addEventListener('click', (e) => {
            if (!navToggle.contains(e.target) && !navLinks.contains(e.target)) {
                navLinks.classList.remove('open');
                navToggle.classList.remove('active');
                navToggle.setAttribute('aria-expanded', 'false');
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && navLinks.classList.contains('open')) {
                navLinks.classList.remove('open');
                navToggle.classList.remove('active');
                navToggle.setAttribute('aria-expanded', 'false');
            }
        });
    }

    // টুল উপাদান পাওয়া গেলে তবেই টুল কোড চালানো হবে
    const uploadZone = document.getElementById('uploadZone');
    if (!uploadZone) return;

    const fileInput = document.getElementById('fileInput');
    const imageGrid = document.getElementById('imageGrid');
    const imageListSection = document.getElementById('imageListSection');
    const settingsSection = document.getElementById('settingsSection');
    const convertSection = document.getElementById('convertSection');
    const successSection = document.getElementById('successSection');
    const imageCountBadge = document.getElementById('imageCount');
    const btnClearAll = document.getElementById('btnClearAll');
    const btnConvert = document.getElementById('btnConvert');
    const btnDownloadAgain = document.getElementById('btnDownloadAgain');
    const btnStartNew = document.getElementById('btnStartNew');
    const pageSizeSelect = document.getElementById('pageSize');
    const orientationSelect = document.getElementById('orientation');
    const processingOverlay = document.getElementById('processingOverlay');
    const progressRingFill = document.getElementById('progressRingFill');
    const progressPercent = document.getElementById('progressPercent');
    const processingTitle = document.getElementById('processingTitle');
    const processingFilename = document.getElementById('processingFilename');
    const processingSteps = document.querySelectorAll('.processing-step');
    const successDesc = document.getElementById('successDesc');
    const toastContainer = document.getElementById('toastContainer');

    let imageFiles = [];
    let imageDataUrls = [];
    let isProcessing = false;
    let generatedPdfBlob = null;
    let generatedPdfFileName = 'converted-images.pdf';
    const MAX_IMAGES = 50;
    const MAX_FILE_SIZE = 25 * 1024 * 1024;
    const ringCircumference = 2 * Math.PI * 54;

    progressRingFill.style.strokeDasharray = ringCircumference;
    progressRingFill.style.strokeDashoffset = ringCircumference;

    const pageSizes = {
        a4: { width: 210, height: 297 },
        letter: { width: 216, height: 279 },
        legal: { width: 216, height: 356 },
        a5: { width: 148, height: 210 },
        a3: { width: 297, height: 420 }
    };

    function showToast(message, type = 'info', duration = 3500) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        const icons = { error: 'fa-circle-exclamation', success: 'fa-circle-check', info: 'fa-circle-info' };
        toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span>${message}</span>`;
        toastContainer.appendChild(toast);
        setTimeout(() => { toast.classList.add('removing'); setTimeout(() => toast.remove(), 320); }, duration);
    }

    function updateSectionVisibility() {
        const hasImages = imageFiles.length > 0;
        imageListSection.classList.toggle('visible', hasImages);
        settingsSection.classList.toggle('visible', hasImages);
        convertSection.classList.toggle('visible', hasImages);
        successSection.classList.remove('visible');
        imageCountBadge.textContent = imageFiles.length;
    }

    function clearAllImages() {
        if (isProcessing) return;
        imageFiles = []; imageDataUrls = []; generatedPdfBlob = null;
        renderImageGrid(); updateSectionVisibility(); fileInput.value = '';
        showToast('All images removed.', 'info');
    }

    function removeImage(index) {
        if (isProcessing) return;
        imageFiles.splice(index, 1); imageDataUrls.splice(index, 1);
        renderImageGrid(); updateSectionVisibility();
    }

    function moveImageLeft(index) {
        if (index <= 0 || isProcessing) return;
        [imageFiles[index], imageFiles[index - 1]] = [imageFiles[index - 1], imageFiles[index]];
        [imageDataUrls[index], imageDataUrls[index - 1]] = [imageDataUrls[index - 1], imageDataUrls[index]];
        renderImageGrid();
    }

    function moveImageRight(index) {
        if (index >= imageFiles.length - 1 || isProcessing) return;
        [imageFiles[index], imageFiles[index + 1]] = [imageFiles[index + 1], imageFiles[index]];
        [imageDataUrls[index], imageDataUrls[index + 1]] = [imageDataUrls[index + 1], imageDataUrls[index]];
        renderImageGrid();
    }

    function renderImageGrid() {
        imageGrid.innerHTML = '';
        imageFiles.forEach((file, index) => {
            const item = document.createElement('div');
            item.className = 'image-item';
            item.setAttribute('draggable', 'true');
            item.innerHTML = `
                <img src="${imageDataUrls[index]}" alt="${file.name}" loading="lazy" draggable="false">
                <span class="image-item-index">${index + 1}</span>
                <div class="image-item-actions">
                    <button class="btn-move-left" ${index === 0 ? 'disabled' : ''}><i class="fas fa-chevron-left"></i></button>
                    <button class="btn-move-right" ${index === imageFiles.length - 1 ? 'disabled' : ''}><i class="fas fa-chevron-right"></i></button>
                    <button class="btn-remove"><i class="fas fa-xmark"></i></button>
                </div>`;
            item.querySelector('.btn-remove').addEventListener('click', (e) => { e.stopPropagation(); removeImage(index); });
            item.querySelector('.btn-move-left').addEventListener('click', (e) => { e.stopPropagation(); moveImageLeft(index); });
            item.querySelector('.btn-move-right').addEventListener('click', (e) => { e.stopPropagation(); moveImageRight(index); });
            imageGrid.appendChild(item);
        });
    }

    function loadFileAsDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
            reader.readAsDataURL(file);
        });
    }

    async function processFiles(fileList) {
        if (isProcessing) return;
        const files = Array.from(fileList);
        if (files.length === 0) return;
        if (imageFiles.length + files.length > MAX_IMAGES) { showToast(`Maximum ${MAX_IMAGES} images allowed.`, 'error'); return; }
        let validCount = 0, skippedCount = 0;
        for (const file of files) {
            const isJpg = file.type === 'image/jpeg' || /\.jpe?g$/i.test(file.name) || file.type === '';
            const isPng = file.type === 'image/png' || /\.png$/i.test(file.name);
            if (!isJpg && !isPng) { skippedCount++; continue; }
            if (file.size > MAX_FILE_SIZE) { showToast(`${file.name} exceeds 25MB limit.`, 'error'); skippedCount++; continue; }
            try {
                const dataUrl = await loadFileAsDataUrl(file);
                imageFiles.push(file); imageDataUrls.push(dataUrl); validCount++;
            } catch { skippedCount++; }
        }
        if (validCount > 0) { renderImageGrid(); updateSectionVisibility(); showToast(`${validCount} image(s) added.`, 'success'); }
        else if (skippedCount > 0) showToast('No valid JPG images found.', 'error');
    }

    uploadZone.addEventListener('click', () => { if (!isProcessing) fileInput.click(); });
    uploadZone.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!isProcessing) fileInput.click(); } });
    fileInput.addEventListener('change', () => processFiles(fileInput.files));
    uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('dragover'); });
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
    uploadZone.addEventListener('drop', (e) => { e.preventDefault(); uploadZone.classList.remove('dragover'); if (!isProcessing && e.dataTransfer.files.length) processFiles(e.dataTransfer.files); });
    btnClearAll.addEventListener('click', clearAllImages);
    btnConvert.addEventListener('click', convertToPdf);
    btnDownloadAgain.addEventListener('click', () => { if (generatedPdfBlob) { downloadBlob(generatedPdfBlob, generatedPdfFileName); } });
    btnStartNew.addEventListener('click', () => { clearAllImages(); window.scrollTo({ top: 0, behavior: 'smooth' }); });

    function updateProgress(percent) {
        const clamped = Math.max(0, Math.min(100, percent));
        progressRingFill.style.strokeDashoffset = ringCircumference - (clamped / 100) * ringCircumference;
        progressPercent.textContent = `${Math.round(clamped)}%`;
    }

    function updateSteps(activeStep, completedSteps) {
        processingSteps.forEach((stepEl) => {
            const stepNum = parseInt(stepEl.dataset.step);
            stepEl.classList.remove('active', 'complete');
            if (completedSteps.includes(stepNum)) stepEl.classList.add('complete');
            else if (stepNum === activeStep) stepEl.classList.add('active');
        });
    }

    function downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url; link.download = filename;
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 3000);
    }

    function loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = src;
        });
    }

    async function convertToPdf() {
        if (isProcessing) return;
        if (imageFiles.length === 0) { showToast('Please add at least one image first.', 'error'); return; }
        if (!window.jspdf?.jsPDF) { showToast('PDF library failed to load.', 'error'); return; }
        isProcessing = true;
        btnConvert.disabled = true;
        processingOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        const pageSizeKey = pageSizeSelect.value;
        const orientation = orientationSelect.value;
        const totalImages = imageFiles.length;
        const basePageSize = pageSizes[pageSizeKey];
        const { jsPDF } = window.jspdf;
        let pdf = null;
        try {
            updateProgress(2); updateSteps(1, []);
            processingTitle.textContent = 'Reading Images...';
            processingFilename.textContent = `Loading ${totalImages} image(s)...`;
            await new Promise(r => setTimeout(r, 400));
            updateProgress(15); updateSteps(2, [1]);
            processingTitle.textContent = 'Processing Images...';
            const loadedImages = [];
            for (let i = 0; i < totalImages; i++) {
                const img = await loadImage(imageDataUrls[i]);
                loadedImages.push(img);
                updateProgress(15 + (i + 1) / totalImages * 45);
                processingFilename.textContent = `Processing image ${i + 1} of ${totalImages}`;
                await new Promise(r => setTimeout(r, 120));
            }
            updateSteps(3, [1, 2]);
            processingTitle.textContent = 'Generating PDF...';
            updateProgress(70);
            for (let i = 0; i < totalImages; i++) {
                const img = loadedImages[i];
                const isLandscape = orientation === 'auto' ? img.naturalWidth > img.naturalHeight : orientation === 'landscape';
                const pageW = isLandscape ? basePageSize.height : basePageSize.width;
                const pageH = isLandscape ? basePageSize.width : basePageSize.height;
                if (i === 0) {
                    pdf = new jsPDF({ orientation: isLandscape ? 'landscape' : 'portrait', unit: 'mm', format: pageSizeKey });
                } else {
                    pdf.addPage([pageW, pageH], isLandscape ? 'landscape' : 'portrait');
                }
                const margin = 12;
                const scale = Math.min((pageW - margin * 2) / img.naturalWidth, (pageH - margin * 2) / img.naturalHeight, 1.5);
                const w = img.naturalWidth * scale, h = img.naturalHeight * scale;
                const x = (pageW - w) / 2, y = (pageH - h) / 2;
                const fmt = (imageFiles[i].type === 'image/png' || /\.png$/i.test(imageFiles[i].name)) ? 'PNG' : 'JPEG';
                pdf.addImage(imageDataUrls[i], fmt, x, y, w, h, undefined, 'FAST');
                updateProgress(70 + (i + 1) / totalImages * 20);
                processingFilename.textContent = `Adding image ${i + 1} of ${totalImages}`;
                await new Promise(r => setTimeout(r, 80));
            }
            updateProgress(92); processingFilename.textContent = 'Finalizing...';
            await new Promise(r => setTimeout(r, 300));
            updateSteps(4, [1, 2, 3]); updateProgress(97);
            const pdfOutput = pdf.output('blob');
            generatedPdfBlob = pdfOutput;
            generatedPdfFileName = `JPG2PDF_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.pdf`;
            await new Promise(r => setTimeout(r, 300));
            updateProgress(100); updateSteps(4, [1,2,3,4]);
            downloadBlob(generatedPdfBlob, generatedPdfFileName);
            await new Promise(r => setTimeout(r, 400));
            processingOverlay.classList.remove('active');
            document.body.style.overflow = '';
            successDesc.textContent = `Successfully converted ${totalImages} image(s) to PDF.`;
            successSection.classList.add('visible');
            convertSection.classList.remove('visible');
            settingsSection.classList.remove('visible');
            imageListSection.classList.remove('visible');
            showToast('PDF generated and downloaded successfully!', 'success');
        } catch (err) {
            console.error(err);
            processingOverlay.classList.remove('active');
            document.body.style.overflow = '';
            showToast('Conversion failed.', 'error');
        } finally {
            isProcessing = false; btnConvert.disabled = false;
            updateProgress(0); updateSteps(0, []);
        }
    }

    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'o') { e.preventDefault(); if (!isProcessing) fileInput.click(); }
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); if (!isProcessing && imageFiles.length > 0) convertToPdf(); }
    });

    updateSectionVisibility();
    console.log('onPDF tool initialized.');
})();