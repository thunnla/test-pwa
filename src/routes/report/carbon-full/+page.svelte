<!-- ============================================================
     /report/carbon-full
     Import TOÀN BỘ Carbon Web Components bundle từ CDN + Carbon CSS.
     Sử dụng cds-* custom elements + Carbon Grid/Layout system.
     Layout cũng dùng Carbon: cds-header, cds-side-nav, cds-grid.
     ============================================================ -->
<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';

	// ── Dữ liệu bảng: 100 dòng (giống 2 trang kia) ──────────────────
	const DEPARTMENTS = ['Kỹ thuật', 'Marketing', 'Kinh doanh', 'Kế toán', 'Hành chính'];
	const POSITIONS   = ['Junior Dev', 'Senior Dev', 'Tech Lead', 'Manager'];
	const STATUSES    = ['Đang làm', 'Đang làm', 'Đang làm', 'Nghỉ phép', 'Thử việc'];

	const tableRows = Array.from({ length: 100 }, (_, i) => ({
		id:         i + 1,
		name:       `Nhân viên ${String(i + 1).padStart(3, '0')}`,
		department: DEPARTMENTS[i % DEPARTMENTS.length],
		position:   POSITIONS[i % POSITIONS.length],
		salary:     `${15 + (i % 25)} triệu`,
		status:     STATUSES[i % STATUSES.length]
	}));

	// ── Form state ─────────────────────────────────────────────────────
	let form = $state({ fullName: '', email: '', department: '', position: '', startDate: '', phone: '' });

	// ── UI state ───────────────────────────────────────────────────────
	let showModal    = $state(false);
	let saved         = $state(false);
	let carbonLoaded  = $state(false); // Toàn bộ bundle đã sẵn sàng
	let sideNavOpen   = $state(true);  // Carbon side-nav toggle

	function handleSubmit() { showModal = true; }
	function confirmSave() {
		saved     = true;
		showModal = false;
		form = { fullName: '', email: '', department: '', position: '', startDate: '', phone: '' };
		setTimeout(() => (saved = false), 3000);
	}

	// ── Performance measurement ──────────────────────────────────────
	interface PerfReport {
		totalJsKB: number; dclTime: number;
		longTaskCount: number; maxLongTaskMs: number;
		jsFileCount: number; measured: boolean;
	}
	let perf = $state<PerfReport>({
		totalJsKB: 0, dclTime: 0, longTaskCount: 0, maxLongTaskMs: 0, jsFileCount: 0, measured: false
	});
	let _longCount = 0;
	let _maxLong   = 0;

	// ── CDN URLs cho Carbon FULL ──────────────────────────────────────
	// Carbon Styles v11 — toàn bộ CSS (theme g10/g90/white)
	const CARBON_CSS_URL = 'https://unpkg.com/@carbon/styles/css/styles.min.css';

	// @carbon/web-components — toàn bộ bundle (bao gồm tất cả components)
	// Đây là file lớn nhất — mục đích benchmark là để đo tác động của nó
	const CARBON_WC_ALL  = 'https://cdn.jsdelivr.net/npm/@carbon/web-components@2/es/all.min.js';

	// Carbon Icons (thêm vào để simulate full Carbon setup)
	const CARBON_ICONS   = 'https://cdn.jsdelivr.net/npm/@carbon/icons@11/es/index.js';

	onMount(() => {
		if (!browser) return;

		// 1. Bắt đầu đếm long tasks ngay khi mount
		if ('PerformanceObserver' in window) {
			try {
				const obs = new PerformanceObserver((list) => {
					for (const entry of list.getEntries()) {
						_longCount++;
						if (entry.duration > _maxLong) _maxLong = entry.duration;
					}
				});
				obs.observe({ entryTypes: ['longtask'] });
			} catch { /* Safari fallback */ }
		}

		// 2. Load Carbon CSS (toàn bộ theme, không chỉ component subset)
		injectCarbonCSS();

		// 3. Load TOÀN BỘ Carbon Web Components bundle
		//    Đây là điểm khác biệt lớn nhất so với carbon-essential:
		//    carbon-full load 1 file JS duy nhất chứa TẤT CẢ components
		loadFullCarbonBundle();

		// 4. Đo sau 5 giây — full bundle cần thời gian parse + execute
		setTimeout(measureAndReport, 5000);
	});

	function injectCarbonCSS() {
		const link  = document.createElement('link');
		link.rel    = 'stylesheet';
		link.href   = CARBON_CSS_URL;
		link.id     = 'carbon-full-css';
		document.head.appendChild(link);

		// Carbon theme attribute trên root element
		document.documentElement.setAttribute('data-carbon-theme', 'white');
	}

	async function loadFullCarbonBundle() {
		// Inject toàn bộ Carbon Web Components qua ESM dynamic import
		const script = document.createElement('script');
		script.type  = 'module';
		// Import full bundle — đây là bundle nặng nhất, chứa MỌI component Carbon
		script.textContent = `
			import '${CARBON_WC_ALL}';
		`;
		script.setAttribute('data-id', 'carbon-full-bundle');
		document.head.appendChild(script);

		// Chờ cds-button được đăng ký (chỉ báo bundle đã execute)
		try {
			await Promise.race([
				customElements.whenDefined('cds-button'),
				new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 15000))
			]);
			carbonLoaded = true;
		} catch {
			// Timeout hoặc CDN lỗi — vẫn hiển thị UI fallback
			carbonLoaded = false;
		}
	}

	function measureAndReport() {
		const resources   = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
		const jsResources = resources.filter(
			(r) => r.initiatorType === 'script' || r.name.endsWith('.js')
		);
		const totalBytes  = jsResources.reduce(
			(sum, r) => sum + (r.transferSize || r.encodedBodySize || 0), 0
		);
		const nav = (performance.getEntriesByType('navigation') as PerformanceNavigationTiming[])[0];
		perf = {
			totalJsKB:    Math.round(totalBytes / 1024),
			dclTime:      nav ? Math.round(nav.domContentLoadedEventEnd - nav.startTime) : 0,
			longTaskCount: _longCount,
			maxLongTaskMs: Math.round(_maxLong),
			jsFileCount:  jsResources.length,
			measured:     true
		};
	}

	function statusColor(s: string) {
		if (s === 'Nghỉ phép') return '#f59e0b';
		if (s === 'Thử việc')  return '#8b5cf6';
		return '#22c55e';
	}
</script>

<svelte:head>
	<title>Carbon Full — Benchmark</title>
	<!-- CSS được inject động — không ảnh hưởng bundle chung -->
</svelte:head>

<!--
	Shell: khi Carbon đã load − dùng cds-header + cds-side-nav (Carbon Layout)
	       khi chưa load   − dùng CSS Grid fallback giống no-carbon
-->
{#if carbonLoaded}
	<!-- ── Full Carbon Layout ── -->
	<div class="carbon-app" data-carbon-theme="white">

		<!-- Carbon Header -->
		<cds-header aria-label="Carbon Full Benchmark">
			<cds-header-menu-button
				button-label-active="Close menu"
				button-label-inactive="Open menu"
				onclick={() => sideNavOpen = !sideNavOpen}
			></cds-header-menu-button>
			<cds-header-name href="#" prefix="🟡">Carbon Full</cds-header-name>
			<div slot="header-global" style="margin-left:auto;padding-right:1rem;display:flex;align-items:center;gap:0.5rem;">
				<span style="font-size:0.75rem;background:#fef9c3;color:#b45309;padding:0.25rem 0.6rem;border-radius:20px;font-weight:600;">
					⚠ Full Bundle Loaded
				</span>
			</div>
		</cds-header>

		<!-- Carbon Side Navigation -->
		<cds-side-nav aria-label="Side navigation" expanded={sideNavOpen} is-not-child-of-header>
			<cds-side-nav-items>
				<cds-side-nav-link href="#dashboard">Dashboard</cds-side-nav-link>
				<cds-side-nav-link href="#employees">Nhân sự</cds-side-nav-link>
				<cds-side-nav-link href="#add">Thêm mới</cds-side-nav-link>
				<cds-side-nav-link href="#perf">Performance</cds-side-nav-link>
				<cds-side-nav-divider></cds-side-nav-divider>
				<cds-side-nav-link href="/report">← Về trang chủ</cds-side-nav-link>
			</cds-side-nav-items>
		</cds-side-nav>

		<!-- Main content area với Carbon spacing -->
		<main class="carbon-main" id="dashboard">

			<!-- ── Bảng 100 dòng — cds-data-table (full Carbon) ── -->
			<section class="carbon-section" id="employees">
				<h2 class="section-heading">Danh sách nhân viên (100 dòng)</h2>
				<cds-table-toolbar>
					<cds-table-toolbar-content>
						<cds-table-toolbar-search placeholder="Tìm kiếm..."></cds-table-toolbar-search>
					</cds-table-toolbar-content>
				</cds-table-toolbar>
				<cds-table>
					<cds-table-head>
						<cds-table-header-row>
							<cds-table-header-cell>#</cds-table-header-cell>
							<cds-table-header-cell>Họ và tên</cds-table-header-cell>
							<cds-table-header-cell>Phòng ban</cds-table-header-cell>
							<cds-table-header-cell>Vị trí</cds-table-header-cell>
							<cds-table-header-cell>Lương</cds-table-header-cell>
							<cds-table-header-cell>Trạng thái</cds-table-header-cell>
						</cds-table-header-row>
					</cds-table-head>
					<cds-table-body>
						{#each tableRows as row}
							<cds-table-row>
								<cds-table-cell>{row.id}</cds-table-cell>
								<cds-table-cell>{row.name}</cds-table-cell>
								<cds-table-cell>{row.department}</cds-table-cell>
								<cds-table-cell>{row.position}</cds-table-cell>
								<cds-table-cell>{row.salary}</cds-table-cell>
								<cds-table-cell>
									<cds-tag type={row.status === 'Nghỉ phép' ? 'yellow' : row.status === 'Thử việc' ? 'purple' : 'green'}>
										{row.status}
									</cds-tag>
								</cds-table-cell>
							</cds-table-row>
						{/each}
					</cds-table-body>
				</cds-table>
			</section>

			<!-- ── Form 6 input — Carbon TextInput + Select ── -->
			<section class="carbon-section" id="add">
				<h2 class="section-heading">Thêm nhân viên mới</h2>

				{#if saved}
					<cds-inline-notification
						kind="success"
						title="Đã lưu thành công!"
						subtitle="Nhân viên đã được thêm vào hệ thống."
					></cds-inline-notification>
				{/if}

				<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
					<div class="carbon-form-grid">
						<cds-text-input
							label="Họ và tên *"
							placeholder="Nguyễn Văn A"
							value={form.fullName}
							oninput={(e: Event) => form.fullName = (e.target as HTMLInputElement).value}
						></cds-text-input>
						<cds-text-input
							label="Email *"
							type="email"
							placeholder="example@company.com"
							value={form.email}
							oninput={(e: Event) => form.email = (e.target as HTMLInputElement).value}
						></cds-text-input>
						<cds-select label-text="Phòng ban" value={form.department}
							onchange={(e: Event) => form.department = (e.target as HTMLSelectElement).value}>
							<cds-select-item value="">— Chọn phòng ban —</cds-select-item>
							{#each DEPARTMENTS as d}
								<cds-select-item value={d}>{d}</cds-select-item>
							{/each}
						</cds-select>
						<cds-select label-text="Vị trí" value={form.position}
							onchange={(e: Event) => form.position = (e.target as HTMLSelectElement).value}>
							<cds-select-item value="">— Chọn vị trí —</cds-select-item>
							{#each POSITIONS as p}
								<cds-select-item value={p}>{p}</cds-select-item>
							{/each}
						</cds-select>
						<cds-date-picker date-picker-type="single">
							<cds-date-picker-input
								label-text="Ngày bắt đầu"
								placeholder="dd/mm/yyyy"
								kind="single"
							></cds-date-picker-input>
						</cds-date-picker>
						<cds-text-input
							label="Số điện thoại"
							type="tel"
							placeholder="0901 234 567"
							value={form.phone}
							oninput={(e: Event) => form.phone = (e.target as HTMLInputElement).value}
						></cds-text-input>
					</div>

					<div class="carbon-form-actions">
						<!-- Carbon Button — nút action chính -->
						<cds-button type="submit" kind="primary" size="lg">
							💾 Lưu nhân viên
						</cds-button>
						<cds-button kind="ghost" size="lg"
							onclick={() => form = { fullName:'',email:'',department:'',position:'',startDate:'',phone:'' }}>
							Xóa form
						</cds-button>
					</div>
				</form>
			</section>

			<!-- ── Performance Report ── -->
			<section class="carbon-section perf-panel-carbon" id="perf">
				<div class="perf-header">
					<h2 class="section-heading" style="margin:0">📊 Performance Report</h2>
					<cds-button kind="tertiary" size="sm" onclick={measureAndReport}>Đo lại</cds-button>
				</div>

				{#if !perf.measured}
					<p class="measuring">⏳ Đang đợi full bundle parse + execute... (sau 5 giây)</p>
				{:else}
					<div class="perf-grid">
						<div class="perf-metric {perf.totalJsKB < 200 ? 'good' : perf.totalJsKB < 500 ? 'warn' : 'bad'}">
							<div class="perf-value">{perf.totalJsKB} KB</div>
							<div class="perf-label">Tổng JS đã tải</div>
							<div class="perf-hint">performance.getEntriesByType('resource')</div>
						</div>
						<div class="perf-metric {perf.dclTime < 1000 ? 'good' : perf.dclTime < 3000 ? 'warn' : 'bad'}">
							<div class="perf-value">{perf.dclTime} ms</div>
							<div class="perf-label">DCL Time</div>
							<div class="perf-hint">navigationStart → DOMContentLoaded</div>
						</div>
						<div class="perf-metric {perf.longTaskCount === 0 ? 'good' : perf.longTaskCount < 5 ? 'warn' : 'bad'}">
							<div class="perf-value">{perf.longTaskCount}</div>
							<div class="perf-label">Long Tasks (≥50ms)</div>
							<div class="perf-hint">PerformanceObserver 'longtask'</div>
						</div>
						<div class="perf-metric {perf.maxLongTaskMs < 100 ? 'good' : 'warn'}">
							<div class="perf-value">{perf.maxLongTaskMs} ms</div>
							<div class="perf-label">Long Task lớn nhất</div>
							<div class="perf-hint">Max duration single longtask</div>
						</div>
						<div class="perf-metric">
							<div class="perf-value">{perf.jsFileCount}</div>
							<div class="perf-label">Số file JS</div>
							<div class="perf-hint">Script resources được tải</div>
						</div>
					</div>
					<p class="perf-note">
						💡 <strong>Carbon Full:</strong> JS bao gồm SvelteKit + toàn bộ @carbon/web-components bundle.
						Đây là "worst case" để so sánh impact tối đa.
					</p>
				{/if}
			</section>

		</main>
	</div>

	<!-- ── Carbon Modal ── -->
	{#if showModal}
		<cds-modal open onclose={() => showModal = false}>
			<cds-modal-header>
				<p class="cds--modal-header__heading">Xác nhận lưu nhân viên?</p>
			</cds-modal-header>
			<cds-modal-body>
				<p>Thêm <strong>{form.fullName || 'nhân viên mới'}</strong> vào hệ thống?</p>
			</cds-modal-body>
			<cds-modal-footer>
				<cds-button kind="secondary" onclick={() => showModal = false}>Hủy</cds-button>
				<cds-button kind="primary"   onclick={confirmSave}>✔ Xác nhận</cds-button>
			</cds-modal-footer>
		</cds-modal>
	{/if}

{:else}
	<!-- ── Fallback: hiển thị trong lúc Carbon bundle đang load ── -->
	<div class="shell">
		<aside class="sidebar">
			<div class="sidebar-logo">
				<span class="logo-icon">🟡</span>
				<span class="logo-text">Carbon Full</span>
			</div>
			<nav class="sidebar-nav">
				<a class="nav-link active" href="#dashboard">Dashboard</a>
				<a class="nav-link" href="/report">← Về trang chủ</a>
			</nav>
		</aside>
		<div class="main-area">
			<header class="topbar">
				<h1 class="topbar-title">Carbon Full — Đang load bundle...</h1>
				<span class="topbar-badge loading">⏳ Tải @carbon/web-components</span>
			</header>
			<div class="loading-content">
				<div class="loading-card">
					<div class="spinner"></div>
					<p>Đang load <strong>toàn bộ Carbon Web Components bundle</strong> từ CDN...</p>
					<p class="loading-hint">Đây là bước đắt nhất — bundle có thể 1MB+. Vui lòng chờ...</p>
					<p class="loading-hint">Sau khi load xong, trang sẽ tự render với Carbon components.</p>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	/* ── Carbon app container ── */
	.carbon-app {
		min-height: 100vh;
		font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif;
	}

	/* Main content — Carbon header chiếm 48px top, side-nav chiếm 256px left */
	.carbon-main {
		margin-top: 48px;      /* Carbon header height */
		margin-left: 256px;    /* Carbon side-nav width */
		padding: 2rem;
		display: flex;
		flex-direction: column;
		gap: 2rem;
		min-height: calc(100vh - 48px);
		background: #f4f4f4;   /* Carbon UI Shell background */
	}

	.carbon-section {
		background: #fff;
		padding: 1.5rem;
		border: 1px solid #e0e0e0;
	}

	.section-heading {
		margin: 0 0 1rem;
		font-size: 1.125rem;
		font-weight: 600;
		color: #161616;
	}

	/* Carbon form grid — 2 cột */
	.carbon-form-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.5rem;
		margin-bottom: 1.5rem;
	}

	.carbon-form-actions { display: flex; gap: 1rem; }

	/* ── Performance panel ── */
	.perf-panel-carbon { border-left: 4px solid #f59e0b; }
	.perf-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
	.measuring { color: #6f6f6f; font-size: 0.875rem; }
	.perf-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 1px; background: #e0e0e0; }
	.perf-metric { background: #fff; padding: 1rem 1.25rem; display: flex; flex-direction: column; gap: 0.25rem; }
	.perf-metric.good .perf-value { color: #15803d; }
	.perf-metric.warn .perf-value { color: #b45309; }
	.perf-metric.bad  .perf-value { color: #dc2626; }
	.perf-value { font-size: 1.5rem; font-weight: 800; font-variant-numeric: tabular-nums; }
	.perf-label { font-size: 0.8rem; font-weight: 600; color: #161616; }
	.perf-hint  { font-size: 0.7rem; color: #6f6f6f; font-family: 'IBM Plex Mono', monospace; }
	.perf-note  { margin: 1rem 0 0; font-size: 0.82rem; color: #525252; padding: 0.75rem; background: #fef9c3; border: 1px solid #fde68a; }

	/* Badge status */
	.badge { font-size: 0.72rem; padding: 0.2rem 0.5rem; border-radius: 20px; font-weight: 500; }

	/* ── Fallback layout (giống no-carbon) ── */
	.shell { display: grid; grid-template-columns: 220px 1fr; grid-template-rows: 100vh; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; color: #1e293b; }
	.sidebar { background: #0f172a; color: #e2e8f0; display: flex; flex-direction: column; overflow-y: auto; }
	.sidebar-logo { display: flex; align-items: center; gap: 0.6rem; padding: 1.25rem 1rem; border-bottom: 1px solid #1e293b; }
	.logo-icon { font-size: 1.4rem; }
	.logo-text { font-size: 0.95rem; font-weight: 700; }
	.sidebar-nav { flex: 1; display: flex; flex-direction: column; padding: 0.75rem 0; }
	.nav-link { display: block; padding: 0.65rem 1rem; color: #94a3b8; text-decoration: none; font-size: 0.85rem; }
	.nav-link.active { background: #f59e0b20; color: #f59e0b; border-left: 3px solid #f59e0b; }
	.main-area { display: flex; flex-direction: column; overflow: hidden; }
	.topbar { background: #fff; border-bottom: 1px solid #e2e8f0; padding: 0.85rem 1.5rem; display: flex; align-items: center; gap: 1rem; flex-shrink: 0; }
	.topbar-title { margin: 0; font-size: 1rem; font-weight: 700; flex: 1; }
	.topbar-badge { font-size: 0.75rem; background: #fef9c3; color: #b45309; padding: 0.25rem 0.6rem; border-radius: 20px; font-weight: 600; }
	.topbar-badge.loading { animation: pulse 1.5s ease-in-out infinite; }

	/* Loading state */
	.loading-content { flex: 1; display: flex; align-items: center; justify-content: center; padding: 2rem; }
	.loading-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 2.5rem; max-width: 480px; text-align: center; display: flex; flex-direction: column; gap: 0.75rem; }
	.loading-card p { margin: 0; font-size: 0.9rem; color: #475569; line-height: 1.6; }
	.loading-hint { font-size: 0.8rem !important; color: #94a3b8 !important; }
	.spinner {
		width: 40px; height: 40px;
		border: 3px solid #e2e8f0;
		border-top-color: #f59e0b;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
		margin: 0 auto 0.5rem;
	}
	@keyframes spin { to { transform: rotate(360deg); } }
	@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }

	/* ── Responsive ── */
	@media (max-width: 700px) {
		.carbon-main { margin-left: 0; margin-top: 48px; }
		.carbon-form-grid { grid-template-columns: 1fr; }
		.shell { grid-template-columns: 1fr; }
	}
</style>
