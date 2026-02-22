<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import {
		getStorageUsage,
		listCaches,
		testOfflineCapability,
		formatBytes,
		type StorageUsage
	} from '$lib/pwa-cache-test';

	// ── State ──

	let isOnline = $state(true);
	let storageInfo = $state<StorageUsage | null>(null);
	let cacheNames = $state<string[]>([]);
	let cacheDetails = $state<{ name: string; count: number; estimatedSize: string }[]>([]);
	let offlineOk = $state<boolean | null>(null);
	let swStatus = $state<'checking' | 'active' | 'inactive' | 'unsupported'>('checking');
	let loading = $state(false);
	let reportTime = $state('');
	let userAgent = $state('');

	// ── Test results state ──
	let testResults = $state<{ name: string; status: 'pending' | 'pass' | 'fail' | 'running'; note: string }[]>([
		{ name: 'Service Worker đăng ký', status: 'pending', note: '' },
		{ name: 'Storage API khả dụng', status: 'pending', note: '' },
		{ name: 'Cache Storage khả dụng', status: 'pending', note: '' },
		{ name: 'Cache chứa dữ liệu', status: 'pending', note: '' },
		{ name: 'Đọc asset từ cache (offline)', status: 'pending', note: '' },
		{ name: 'Ứng dụng có thể cài đặt', status: 'pending', note: '' }
	]);

	// ── Environment info ──
	interface EnvInfo {
		device: string;
		os: string;
		browser: string;
		browserVersion: string;
		connectionType: string;
	}
	let envInfo = $state<EnvInfo>({
		device: '—',
		os: '—',
		browser: '—',
		browserVersion: '—',
		connectionType: '—'
	});

	// ── Lifecycle ──

	onMount(() => {
		isOnline = navigator.onLine;
		window.addEventListener('online', () => (isOnline = true));
		window.addEventListener('offline', () => (isOnline = false));
		reportTime = new Date().toLocaleString('vi-VN');
		userAgent = navigator.userAgent;
		detectEnvironment();
	});

	function detectEnvironment() {
		const ua = navigator.userAgent;

		// Device
		if (/Mobi|Android/i.test(ua)) {
			envInfo.device = /iPad|Tablet/i.test(ua) ? 'Tablet' : 'Mobile';
		} else {
			envInfo.device = 'Desktop';
		}

		// OS
		if (/Windows/i.test(ua)) envInfo.os = 'Windows';
		else if (/Mac OS/i.test(ua)) envInfo.os = 'macOS';
		else if (/Android/i.test(ua)) envInfo.os = 'Android';
		else if (/iPhone|iPad|iPod/i.test(ua)) envInfo.os = 'iOS';
		else if (/Linux/i.test(ua)) envInfo.os = 'Linux';
		else envInfo.os = 'Unknown';

		// Browser
		if (/Edg\//i.test(ua)) {
			envInfo.browser = 'Edge';
			envInfo.browserVersion = ua.match(/Edg\/([\d.]+)/)?.[1] ?? '';
		} else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) {
			envInfo.browser = 'Chrome';
			envInfo.browserVersion = ua.match(/Chrome\/([\d.]+)/)?.[1] ?? '';
		} else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) {
			envInfo.browser = 'Safari';
			envInfo.browserVersion = ua.match(/Version\/([\d.]+)/)?.[1] ?? '';
		} else if (/Firefox\//i.test(ua)) {
			envInfo.browser = 'Firefox';
			envInfo.browserVersion = ua.match(/Firefox\/([\d.]+)/)?.[1] ?? '';
		} else {
			envInfo.browser = 'Unknown';
		}

		// Connection
		const conn = (navigator as any).connection;
		if (conn) {
			envInfo.connectionType = `${conn.effectiveType ?? 'unknown'} (downlink: ${conn.downlink ?? '?'} Mbps)`;
		} else {
			envInfo.connectionType = navigator.onLine ? 'Online' : 'Offline';
		}
	}

	// ── Run all tests ──

	async function runAllTests() {
		loading = true;
		reportTime = new Date().toLocaleString('vi-VN');

		// Reset
		testResults = testResults.map((t) => ({ ...t, status: 'pending' as const, note: '' }));

		// 1. Service Worker
		await runTest(0, async () => {
			if (!('serviceWorker' in navigator)) {
				swStatus = 'unsupported';
				throw new Error('Trình duyệt không hỗ trợ Service Worker');
			}

			// Thử lấy registration hiện tại trước
			let reg = await navigator.serviceWorker.getRegistration();

			if (reg?.active) {
				swStatus = 'active';
				return `Scope: ${reg.scope} (active)`;
			}

			// SW có thể đang installing/waiting — chờ ready với timeout 10s
			if (reg?.installing || reg?.waiting) {
				const readyReg = await Promise.race([
					navigator.serviceWorker.ready,
					new Promise<null>((resolve) => setTimeout(() => resolve(null), 10000))
				]);
				if (readyReg?.active) {
					swStatus = 'active';
					return `Scope: ${readyReg.scope} (activated sau khi chờ)`;
				}
			}

			// Thử chờ ready lần cuối (trường hợp chưa có registration)
			try {
				const readyReg = await Promise.race([
					navigator.serviceWorker.ready,
					new Promise<null>((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000))
				]);
				if (readyReg?.active) {
					swStatus = 'active';
					return `Scope: ${readyReg.scope} (ready)`;
				}
			} catch {
				// timeout
			}

			swStatus = 'inactive';
			throw new Error('Service Worker chưa active sau 10s chờ. Thử reload trang và chạy lại.');
		});

		// 2. Storage API
		await runTest(1, async () => {
			if (!navigator.storage?.estimate) {
				throw new Error('StorageManager API không được hỗ trợ');
			}
			storageInfo = await getStorageUsage();
			return `Used: ${formatBytes(storageInfo.usage)} / Quota: ${formatBytes(storageInfo.quota)} (${storageInfo.percentUsed}%)`;
		});

		// 3. Cache Storage available
		await runTest(2, async () => {
			if (!('caches' in window)) {
				throw new Error('CacheStorage API không được hỗ trợ');
			}
			cacheNames = await listCaches();
			return `${cacheNames.length} cache(s) tìm thấy`;
		});

		// 4. Caches have data
		await runTest(3, async () => {
			const details: typeof cacheDetails = [];
			for (const name of cacheNames) {
				const cache = await caches.open(name);
				const keys = await cache.keys();
				details.push({ name, count: keys.length, estimatedSize: '—' });
			}
			cacheDetails = details;
			const totalEntries = details.reduce((s, d) => s + d.count, 0);
			if (totalEntries === 0) throw new Error('Không có entry nào trong cache');
			return `Tổng: ${totalEntries} entries trong ${details.length} caches`;
		});

		// 5. Offline read
		await runTest(4, async () => {
			offlineOk = await testOfflineCapability();
			if (!offlineOk) throw new Error('Không thể đọc asset từ cache');
			return 'Đọc asset từ cache thành công';
		});

		// 6. Installable
		await runTest(5, async () => {
			// Kiểm tra app đã được cài đặt chưa (standalone mode)
			const isStandalone =
				window.matchMedia('(display-mode: standalone)').matches ||
				(navigator as any).standalone === true ||
				document.referrer.includes('android-app://');

			if (isStandalone) {
				return '✅ App đã được cài đặt (đang chạy standalone mode)';
			}

			// Chưa cài → kiểm tra điều kiện installable
			const manifest = document.querySelector('link[rel="manifest"]');
			if (!manifest) throw new Error('Không tìm thấy manifest link');

			const reg = await navigator.serviceWorker?.getRegistration();
			if (!reg?.active) throw new Error('Cần Service Worker hoạt động để cài đặt');

			return 'Manifest + SW sẵn sàng (chưa cài đặt)';
		});

		loading = false;
	}

	async function runTest(index: number, fn: () => Promise<string>) {
		testResults[index] = { ...testResults[index], status: 'running', note: '' };
		try {
			const note = await fn();
			testResults[index] = { ...testResults[index], status: 'pass', note };
		} catch (e: any) {
			testResults[index] = { ...testResults[index], status: 'fail', note: e.message ?? String(e) };
		}
	}

	// ── Computed ──
	function getPassCount(): number {
		return testResults.filter((t) => t.status === 'pass').length;
	}

	function getFailCount(): number {
		return testResults.filter((t) => t.status === 'fail').length;
	}

	function getStorageLevel(): 'safe' | 'warn' | 'danger' {
		if (!storageInfo) return 'safe';
		if (storageInfo.percentUsed > 80) return 'danger';
		if (storageInfo.percentUsed > 50) return 'warn';
		return 'safe';
	}

	function getOverallResult(): 'pass' | 'fail' | 'pending' {
		if (testResults.some((t) => t.status === 'pending' || t.status === 'running')) return 'pending';
		if (testResults.every((t) => t.status === 'pass')) return 'pass';
		return 'fail';
	}
</script>

<svelte:head>
	<title>Báo cáo kiểm thử Cache Offline PWA</title>
</svelte:head>

<div class="page">
	<!-- HEADER -->
	<header class="report-header">
		<h1>📋 BÁO CÁO KIỂM THỬ CACHE OFFLINE PWA</h1>
		<span class="badge" class:online={isOnline} class:offline={!isOnline}>
			{isOnline ? '🟢 ONLINE' : '🔴 OFFLINE'}
		</span>
	</header>

	<div class="action-bar">
		<button class="btn btn-primary btn-lg" onclick={runAllTests} disabled={loading}>
			{loading ? '⏳ Đang kiểm thử…' : '▶ Chạy tất cả kiểm thử'}
		</button>
		{#if getOverallResult() === 'pass'}
			<span class="overall pass">✅ TẤT CẢ PASS</span>
		{:else if getOverallResult() === 'fail'}
			<span class="overall fail">❌ CÓ LỖI ({getFailCount()} FAIL)</span>
		{:else}
			<span class="overall pending">⏸ Chưa chạy / đang chạy</span>
		{/if}
	</div>

	<!-- 1. THÔNG TIN CHUNG -->
	<section class="card">
		<h2>1. Thông tin chung</h2>
		<table class="info-table">
			<tbody>
				<tr><td class="label">Tên dự án</td><td>Lam Thuong Digital Platform – PWA Offline System</td></tr>
				<tr><td class="label">Phiên bản</td><td>v0.0.1</td></tr>
				<tr><td class="label">Thời gian kiểm thử</td><td>{reportTime || '—'}</td></tr>
				<tr>
					<td class="label">Mục tiêu</td>
					<td>Xác minh khả năng cache dữ liệu (100–150 MB) và hoạt động bình thường khi offline</td>
				</tr>
			</tbody>
		</table>
	</section>

	<!-- 2. MÔI TRƯỜNG -->
	<section class="card">
		<h2>2. Môi trường kiểm thử</h2>
		<table class="info-table">
			<tbody>
				<tr><td class="label">Thiết bị</td><td>{envInfo.device}</td></tr>
				<tr><td class="label">Hệ điều hành</td><td>{envInfo.os}</td></tr>
				<tr><td class="label">Trình duyệt</td><td>{envInfo.browser} {envInfo.browserVersion}</td></tr>
				<tr><td class="label">Kết nối</td><td>{envInfo.connectionType}</td></tr>
				<tr><td class="label">User Agent</td><td class="ua">{userAgent || '—'}</td></tr>
			</tbody>
		</table>
	</section>

	<!-- 3. STORAGE -->
	<section class="card">
		<h2>3. Kết quả Storage</h2>
		{#if storageInfo}
			<div class="stat-grid">
				<div class="stat">
					<span class="stat-label">Đã sử dụng</span>
					<span class="stat-value">{formatBytes(storageInfo.usage)}</span>
				</div>
				<div class="stat">
					<span class="stat-label">Giới hạn (Quota)</span>
					<span class="stat-value">{formatBytes(storageInfo.quota)}</span>
				</div>
				<div class="stat">
					<span class="stat-label">Tỷ lệ</span>
					<span class="stat-value">{storageInfo.percentUsed}%</span>
				</div>
			</div>
			<div class="progress-track">
				<div
					class="progress-fill"
					style="width:{Math.min(storageInfo.percentUsed, 100)}%"
					class:warn={getStorageLevel() === 'warn'}
					class:danger={getStorageLevel() === 'danger'}
				></div>
			</div>
			<div class="storage-eval">
				{#if getStorageLevel() === 'safe'}
					<span class="eval safe">✅ Trong giới hạn an toàn</span>
				{:else if getStorageLevel() === 'warn'}
					<span class="eval warn-text">⚠️ Gần giới hạn (> 50%)</span>
				{:else}
					<span class="eval danger-text">🚨 Vượt giới hạn nguy hiểm (> 80%)</span>
				{/if}
			</div>
		{:else}
			<p class="muted">Nhấn "Chạy tất cả kiểm thử" để thu thập dữ liệu storage.</p>
		{/if}
	</section>

	<!-- 4. CACHE STORAGE -->
	<section class="card">
		<h2>4. Kiểm tra Cache Storage</h2>
		{#if cacheDetails.length > 0}
			<table class="data-table">
				<thead>
					<tr>
						<th>Cache Name</th>
						<th>Số entries</th>
						<th>Trạng thái</th>
					</tr>
				</thead>
				<tbody>
					{#each cacheDetails as cache}
						<tr>
							<td><code>{cache.name}</code></td>
							<td class="center">{cache.count}</td>
							<td class="center">
								{#if cache.count > 0}
									<span class="tag pass">✅ OK</span>
								{:else}
									<span class="tag fail">⚠️ Rỗng</span>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{:else if cacheNames.length > 0}
			<ul class="tag-list">
				{#each cacheNames as name}
					<li><code>{name}</code></li>
				{/each}
			</ul>
		{:else}
			<p class="muted">Chưa có dữ liệu cache. Nhấn chạy kiểm thử.</p>
		{/if}
	</section>

	<!-- 5. KẾT QUẢ KIỂM THỬ -->
	<section class="card">
		<h2>5. Kết quả kiểm thử</h2>
		<table class="data-table">
			<thead>
				<tr>
					<th>#</th>
					<th>Test case</th>
					<th>Kết quả</th>
					<th>Ghi chú</th>
				</tr>
			</thead>
			<tbody>
				{#each testResults as test, i}
					<tr>
						<td class="center">{i + 1}</td>
						<td>{test.name}</td>
						<td class="center">
							{#if test.status === 'pass'}
								<span class="tag pass">✅ PASS</span>
							{:else if test.status === 'fail'}
								<span class="tag fail">❌ FAIL</span>
							{:else if test.status === 'running'}
								<span class="tag running">⏳ …</span>
							{:else}
								<span class="tag pending">⏸ —</span>
							{/if}
						</td>
						<td class="note">{test.note}</td>
					</tr>
				{/each}
			</tbody>
		</table>

		{#if getOverallResult() !== 'pending'}
			<div class="summary-bar">
				<span class="summary-item pass">✅ Pass: {getPassCount()}</span>
				<span class="summary-item fail">❌ Fail: {getFailCount()}</span>
				<span class="summary-item">Tổng: {testResults.length}</span>
			</div>
		{/if}
	</section>

	<!-- 6. SERVICE WORKER -->
	<section class="card">
		<h2>6. Service Worker</h2>
		<div class="sw-status">
			{#if swStatus === 'active'}
				<span class="tag pass">✅ Đang hoạt động</span>
			{:else if swStatus === 'inactive'}
				<span class="tag fail">⚠️ Chưa hoạt động</span>
			{:else if swStatus === 'unsupported'}
				<span class="tag fail">❌ Không hỗ trợ</span>
			{:else}
				<span class="tag pending">⏸ Chưa kiểm tra</span>
			{/if}
		</div>
		<p class="muted">Mode: <strong>generateSW</strong> (vite-plugin-pwa / Workbox)</p>
	</section>

	<!-- 7. KẾT LUẬN -->
	<section class="card">
		<h2>7. Kết luận</h2>
		{#if getOverallResult() === 'pass'}
			<div class="conclusion pass-bg">
				<p>✅ <strong>Tất cả kiểm thử đều PASS.</strong></p>
				<ul>
					<li>Hệ thống hoạt động ổn định{storageInfo ? ` với ${formatBytes(storageInfo.usage)} cache` : ''}.</li>
					<li>Các chức năng chính (map, image, audio) sẵn sàng offline.</li>
					<li>Không phát hiện lỗi nghiêm trọng liên quan đến cache.</li>
				</ul>
			</div>
		{:else if getOverallResult() === 'fail'}
			<div class="conclusion fail-bg">
				<p>❌ <strong>Có {getFailCount()} test case FAIL.</strong></p>
				<ul>
					{#each testResults.filter((t) => t.status === 'fail') as failed}
						<li><strong>{failed.name}:</strong> {failed.note}</li>
					{/each}
				</ul>
				<p>Cần kiểm tra lại trước khi triển khai offline.</p>
			</div>
		{:else}
			<p class="muted">Nhấn "Chạy tất cả kiểm thử" để xem kết luận.</p>
		{/if}
	</section>

	<!-- 8. BƯỚC TIẾP THEO -->
	<section class="card">
		<h2>8. Bước tiếp theo</h2>
		<ul class="checklist">
			<li>☐ Kiểm thử trên Android (Chrome)</li>
			<li>☐ Kiểm thử trên iOS (Safari)</li>
			<li>☐ Kiểm thử giới hạn cache tối đa</li>
			<li>☐ Kiểm thử background sync</li>
			<li>☐ Kiểm thử với mạng chậm (3G throttling)</li>
		</ul>
	</section>
</div>

<style>
	.page {
		max-width: 860px;
		margin: 0 auto;
		padding: 1.5rem 1rem 3rem;
		font-family: system-ui, -apple-system, sans-serif;
		color: #1a1a2e;
	}

	/* Header */
	.report-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}
	.report-header h1 {
		font-size: 1.35rem;
		margin: 0;
	}

	.badge {
		font-size: 0.82rem;
		font-weight: 600;
		padding: 0.25rem 0.7rem;
		border-radius: 999px;
	}
	.online { background: #dcfce7; color: #166534; }
	.offline { background: #fee2e2; color: #991b1b; }

	/* Action bar */
	.action-bar {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1.25rem;
		flex-wrap: wrap;
	}

	.overall {
		font-weight: 700;
		font-size: 0.95rem;
	}
	.overall.pass { color: #16a34a; }
	.overall.fail { color: #dc2626; }
	.overall.pending { color: #64748b; }

	/* Cards */
	.card {
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 10px;
		padding: 1rem 1.25rem;
		margin-bottom: 1rem;
	}
	.card h2 {
		font-size: 1.05rem;
		margin: 0 0 0.75rem;
		color: #1e293b;
	}

	/* Info table */
	.info-table {
		width: 100%;
		border-collapse: collapse;
	}
	.info-table td {
		padding: 0.4rem 0.5rem;
		font-size: 0.88rem;
		border-bottom: 1px solid #f1f5f9;
		vertical-align: top;
	}
	.info-table .label {
		font-weight: 600;
		color: #475569;
		white-space: nowrap;
		width: 160px;
	}
	.ua {
		font-size: 0.72rem;
		color: #94a3b8;
		word-break: break-all;
	}

	/* Data table */
	.data-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.85rem;
	}
	.data-table th {
		background: #f1f5f9;
		padding: 0.5rem;
		text-align: left;
		font-weight: 600;
		color: #475569;
		border-bottom: 2px solid #e2e8f0;
	}
	.data-table td {
		padding: 0.45rem 0.5rem;
		border-bottom: 1px solid #f1f5f9;
	}
	.data-table .center { text-align: center; }
	.data-table .note {
		font-size: 0.78rem;
		color: #64748b;
		max-width: 280px;
		word-break: break-word;
	}

	/* Tags */
	.tag {
		display: inline-block;
		padding: 0.15rem 0.5rem;
		border-radius: 6px;
		font-size: 0.78rem;
		font-weight: 600;
		white-space: nowrap;
	}
	.tag.pass { background: #dcfce7; color: #166534; }
	.tag.fail { background: #fee2e2; color: #991b1b; }
	.tag.running { background: #fef3c7; color: #92400e; }
	.tag.pending { background: #f1f5f9; color: #94a3b8; }

	.tag-list {
		list-style: none;
		padding: 0;
		margin: 0.25rem 0;
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}
	.tag-list li {
		background: #fff;
		border: 1px solid #e2e8f0;
		border-radius: 6px;
		padding: 0.2rem 0.55rem;
		font-size: 0.8rem;
	}

	/* Stats */
	.stat-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.75rem;
		margin: 0.75rem 0;
	}
	.stat { display: flex; flex-direction: column; gap: 0.1rem; }
	.stat-label {
		font-size: 0.75rem;
		color: #64748b;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}
	.stat-value { font-size: 1.1rem; font-weight: 600; }

	/* Progress */
	.progress-track {
		height: 8px;
		background: #e2e8f0;
		border-radius: 4px;
		overflow: hidden;
		margin-bottom: 0.5rem;
	}
	.progress-fill {
		height: 100%;
		background: #22c55e;
		border-radius: 4px;
		transition: width 0.3s;
	}
	.progress-fill.warn { background: #f59e0b; }
	.progress-fill.danger { background: #ef4444; }

	.storage-eval { margin-top: 0.25rem; }
	.eval { font-size: 0.88rem; font-weight: 600; }
	.eval.safe { color: #16a34a; }
	.eval.warn-text { color: #d97706; }
	.eval.danger-text { color: #dc2626; }

	/* Summary bar */
	.summary-bar {
		display: flex;
		gap: 1.25rem;
		margin-top: 0.75rem;
		padding-top: 0.75rem;
		border-top: 1px solid #e2e8f0;
		font-size: 0.88rem;
		font-weight: 600;
	}
	.summary-item.pass { color: #16a34a; }
	.summary-item.fail { color: #dc2626; }

	/* SW status */
	.sw-status { margin-bottom: 0.5rem; }

	/* Conclusion */
	.conclusion {
		padding: 0.75rem 1rem;
		border-radius: 8px;
		font-size: 0.9rem;
	}
	.conclusion p { margin: 0 0 0.5rem; }
	.conclusion ul {
		margin: 0.25rem 0 0;
		padding-left: 1.25rem;
	}
	.conclusion li {
		margin-bottom: 0.2rem;
		font-size: 0.88rem;
	}
	.pass-bg { background: #f0fdf4; border: 1px solid #bbf7d0; }
	.fail-bg { background: #fef2f2; border: 1px solid #fecaca; }

	/* Checklist */
	.checklist {
		list-style: none;
		padding: 0;
		margin: 0;
	}
	.checklist li {
		padding: 0.35rem 0;
		font-size: 0.88rem;
		border-bottom: 1px solid #f1f5f9;
	}

	/* Buttons */
	.btn {
		padding: 0.5rem 0.9rem;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		background: #f1f5f9;
		color: #334155;
		cursor: pointer;
		font-size: 0.85rem;
		font-weight: 500;
		transition: background 0.15s;
	}
	.btn:disabled { opacity: 0.5; cursor: not-allowed; }
	.btn-primary { background: #2563eb; color: #fff; border-color: #2563eb; }
	.btn-primary:hover:not(:disabled) { background: #1d4ed8; }
	.btn-lg {
		padding: 0.65rem 1.5rem;
		font-size: 0.95rem;
	}

	.muted { color: #94a3b8; font-size: 0.88rem; }
	code { font-family: 'SF Mono', Consolas, monospace; font-size: 0.78rem; }
</style>