<!-- ============================================================
     /report/carbon-essential
     Chỉ load 4 Carbon component cần thiết qua CDN trong onMount:
       • Carbon CSS (stylesheet dùng chung)
       • cds-button  (Button)
       • cds-text-input  (TextInput)
       • cds-modal + cds-modal-* (Modal)
       • cds-data-table + cds-table-* (DataTable)
     Layout và Grid vẫn là CSS Grid tự viết.
     ============================================================ -->
<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';

	// ── Dữ liệu bảng: 100 dòng (giống no-carbon, cùng structure) ──────
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

	// ── Modal & alert state ────────────────────────────────────────────
	let showModal   = $state(false);
	let saved        = $state(false);
	let carbonLoaded = $state(false); // Carbon components đã ready chưa

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

	// ── URLs CDN cho Carbon (chỉ 4 components thiết yếu) ──────────────
	// Dùng @carbon/web-components từ jsDelivr — chỉ các module cần thiết
	const CARBON_CSS_URL = 'https://unpkg.com/@carbon/styles/css/styles.min.css';
	const CARBON_WC_BASE = 'https://cdn.jsdelivr.net/npm/@carbon/web-components@2/es/components';
	const ESSENTIAL_COMPONENTS = [
		`${CARBON_WC_BASE}/button/button.js`,
		`${CARBON_WC_BASE}/text-input/text-input.js`,
		`${CARBON_WC_BASE}/modal/modal.js`,
		`${CARBON_WC_BASE}/modal/modal-header.js`,
		`${CARBON_WC_BASE}/modal/modal-body.js`,
		`${CARBON_WC_BASE}/modal/modal-footer.js`,
		`${CARBON_WC_BASE}/data-table/data-table.js`,
		`${CARBON_WC_BASE}/data-table/table.js`,
		`${CARBON_WC_BASE}/data-table/table-head.js`,
		`${CARBON_WC_BASE}/data-table/table-header-row.js`,
		`${CARBON_WC_BASE}/data-table/table-header-cell.js`,
		`${CARBON_WC_BASE}/data-table/table-body.js`,
		`${CARBON_WC_BASE}/data-table/table-row.js`,
		`${CARBON_WC_BASE}/data-table/table-cell.js`,
		`${CARBON_WC_BASE}/select/select.js`
	];

	onMount(() => {
		if (!browser) return;

		// 1. Đếm long tasks ngay từ đầu
		if ('PerformanceObserver' in window) {
			try {
				const obs = new PerformanceObserver((list) => {
					for (const entry of list.getEntries()) {
						_longCount++;
						if (entry.duration > _maxLong) _maxLong = entry.duration;
					}
				});
				obs.observe({ entryTypes: ['longtask'] });
			} catch { /* Safari không hỗ trợ longtask */ }
		}

		// 2. Dynamic import Carbon CSS (chỉ @carbon/styles)
		injectCarbonCSS();

		// 3. Dynamic import CHỈ 4 component cần thiết — không load full bundle
		loadEssentialComponents();

		// 4. Đo sau 3 giây để CSS + selective components kịp load
		setTimeout(measureAndReport, 3000);
	});

	/** Inject Carbon CSS vào <head> bằng cách tạo thẻ <link> động */
	function injectCarbonCSS() {
		const link = document.createElement('link');
		link.rel  = 'stylesheet';
		link.href = CARBON_CSS_URL;
		link.id   = 'carbon-essential-css';
		document.head.appendChild(link);
	}

	/** Dynamically load từng Carbon component module riêng lẻ qua ES module script */
	async function loadEssentialComponents() {
		// Tạo một script type=module để import từng component
		const script = document.createElement('script');
		script.type = 'module';
		// Import tuần tự để không spam CDN
		script.textContent = ESSENTIAL_COMPONENTS.map(
			(url) => `import '${url}';`
		).join('\n');
		document.head.appendChild(script);

		// Chờ customElements được đăng ký
		try {
			await customElements.whenDefined('cds-button');
			carbonLoaded = true;
		} catch {
			// Fallback: dùng native HTML elements nếu CDN fail
			carbonLoaded = false;
		}
	}

	function measureAndReport() {
		const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
		const jsResources = resources.filter(
			(r) => r.initiatorType === 'script' || r.name.endsWith('.js')
		);
		const totalBytes = jsResources.reduce(
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
	<title>Carbon Essential — Benchmark</title>
	<!-- Carbon CSS được inject động trong onMount, KHÔNG đặt <link> tĩnh ở đây
	     để đảm bảo nó không ảnh hưởng các route khác -->
</svelte:head>

<div class="shell">

	<!-- Sidebar — layout custom, không dùng Carbon -->
	<aside class="sidebar">
		<div class="sidebar-logo">
			<span class="logo-icon">🔵</span>
			<span class="logo-text">Carbon Essential</span>
		</div>
		<nav class="sidebar-nav">
			<a class="nav-link active" href="#dashboard">Dashboard</a>
			<a class="nav-link" href="#employees">Nhân sự</a>
			<a class="nav-link" href="#add">Thêm mới</a>
			<a class="nav-link" href="#perf">Performance</a>
		</nav>
		<div class="sidebar-footer">
			<a href="/report" class="back-link">← Về trang chủ</a>
		</div>
	</aside>

	<div class="main-area">
		<header class="topbar">
			<h1 class="topbar-title">Benchmark — Carbon Essential (4 Components CDN)</h1>
			<span class="topbar-badge">
				{carbonLoaded ? '✅ Carbon loaded' : '⏳ Loading Carbon...'}
			</span>
		</header>

		<div class="content" id="dashboard">

			<!-- ── Bảng 100 dòng — dùng cds-data-table nếu đã load ── -->
			<section class="card" id="employees">
				<div class="card-header">
					<h2 class="card-title">Danh sách nhân viên (100 dòng)</h2>
					<span class="row-count">
						{carbonLoaded ? 'Carbon DataTable' : 'Native HTML table'}
					</span>
				</div>

				{#if carbonLoaded}
					<!--
						Carbon Web Component: <cds-table>
						Chỉ được render sau khi component JS đã load qua CDN
					-->
					<div class="table-wrapper">
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
											<span class="badge" style="background:{statusColor(row.status)}20;color:{statusColor(row.status)}">
												{row.status}
											</span>
										</cds-table-cell>
									</cds-table-row>
								{/each}
							</cds-table-body>
						</cds-table>
					</div>
				{:else}
					<!-- Fallback: native table khi Carbon chưa load -->
					<div class="table-wrapper">
						<table class="data-table">
							<thead>
								<tr>
									<th>#</th><th>Họ và tên</th><th>Phòng ban</th>
									<th>Vị trí</th><th>Lương</th><th>Trạng thái</th>
								</tr>
							</thead>
							<tbody>
								{#each tableRows as row}
									<tr>
										<td>{row.id}</td>
										<td>{row.name}</td>
										<td>{row.department}</td>
										<td>{row.position}</td>
										<td>{row.salary}</td>
										<td>
											<span class="badge" style="background:{statusColor(row.status)}20;color:{statusColor(row.status)}">
												{row.status}
											</span>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</section>

			<!-- ── Form 6 input — dùng cds-text-input khi đã load ── -->
			<section class="card" id="add">
				<div class="card-header">
					<h2 class="card-title">Thêm nhân viên mới</h2>
					<span class="row-count">{carbonLoaded ? 'cds-text-input' : 'native input'}</span>
				</div>

				{#if saved}
					<div class="alert-success">✅ Đã lưu thành công!</div>
				{/if}

				<form class="form-grid" onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
					{#if carbonLoaded}
						<!--
							Carbon TextInput Web Component
							Mỗi field dùng <cds-text-input> thay vì <input>
						-->
						<div class="field">
							<cds-text-input
								label="Họ và tên *"
								placeholder="Nguyễn Văn A"
								value={form.fullName}
								oninput={(e: Event) => form.fullName = (e.target as HTMLInputElement).value}
							></cds-text-input>
						</div>
						<div class="field">
							<cds-text-input
								label="Email *"
								type="email"
								placeholder="example@company.com"
								value={form.email}
								oninput={(e: Event) => form.email = (e.target as HTMLInputElement).value}
							></cds-text-input>
						</div>
						<div class="field">
							<label class="label">Phòng ban</label>
							<select class="cds-select" bind:value={form.department}>
								<option value="">— Chọn phòng ban —</option>
								{#each DEPARTMENTS as d}<option value={d}>{d}</option>{/each}
							</select>
						</div>
						<div class="field">
							<label class="label">Vị trí</label>
							<select class="cds-select" bind:value={form.position}>
								<option value="">— Chọn vị trí —</option>
								{#each POSITIONS as p}<option value={p}>{p}</option>{/each}
							</select>
						</div>
						<div class="field">
							<cds-text-input
								label="Ngày bắt đầu"
								type="date"
								value={form.startDate}
								oninput={(e: Event) => form.startDate = (e.target as HTMLInputElement).value}
							></cds-text-input>
						</div>
						<div class="field">
							<cds-text-input
								label="Số điện thoại"
								type="tel"
								placeholder="0901 234 567"
								value={form.phone}
								oninput={(e: Event) => form.phone = (e.target as HTMLInputElement).value}
							></cds-text-input>
						</div>
						<!-- Carbon Button -->
						<div class="field full-width form-actions">
							<cds-button type="submit" kind="primary">💾 Lưu nhân viên</cds-button>
							<cds-button kind="ghost" onclick={() => form = { fullName:'',email:'',department:'',position:'',startDate:'',phone:'' }}>
								Xóa form
							</cds-button>
						</div>
					{:else}
						<!-- Native fallback trong lúc chờ Carbon load -->
						<div class="field">
							<label class="label" for="ce-name">Họ và tên <span class="required">*</span></label>
							<input id="ce-name" class="input" type="text" placeholder="Nguyễn Văn A" bind:value={form.fullName} />
						</div>
						<div class="field">
							<label class="label" for="ce-email">Email</label>
							<input id="ce-email" class="input" type="email" placeholder="example@company.com" bind:value={form.email} />
						</div>
						<div class="field">
							<label class="label" for="ce-dept">Phòng ban</label>
							<select id="ce-dept" class="input" bind:value={form.department}>
								<option value="">— Chọn —</option>
								{#each DEPARTMENTS as d}<option value={d}>{d}</option>{/each}
							</select>
						</div>
						<div class="field">
							<label class="label" for="ce-pos">Vị trí</label>
							<select id="ce-pos" class="input" bind:value={form.position}>
								<option value="">— Chọn —</option>
								{#each POSITIONS as p}<option value={p}>{p}</option>{/each}
							</select>
						</div>
						<div class="field">
							<label class="label" for="ce-date">Ngày bắt đầu</label>
							<input id="ce-date" class="input" type="date" bind:value={form.startDate} />
						</div>
						<div class="field">
							<label class="label" for="ce-phone">Số điện thoại</label>
							<input id="ce-phone" class="input" type="tel" placeholder="0901 234 567" bind:value={form.phone} />
						</div>
						<div class="field full-width form-actions">
							<button type="submit" class="btn btn-primary">💾 Lưu nhân viên</button>
							<button type="button" class="btn btn-ghost">Xóa form</button>
						</div>
					{/if}
				</form>
			</section>

			<!-- ── Performance Report Panel ── -->
			<section class="card perf-panel" id="perf">
				<div class="card-header">
					<h2 class="card-title">📊 Performance Report</h2>
					<button class="btn btn-sm" onclick={measureAndReport}>Đo lại</button>
				</div>

				{#if !perf.measured}
					<p class="measuring">⏳ Đang chờ Carbon load + đo... (sau 3 giây)</p>
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
						💡 <strong>Carbon Essential:</strong> JS bao gồm SvelteKit + 4 Carbon WC modules qua CDN.
						Carbon CSS được inject động qua &lt;link&gt; (không tính vào JS KB).
					</p>
				{/if}
			</section>

		</div>
	</div>
</div>

<!-- ── Modal xác nhận — dùng cds-modal khi đã load ── -->
{#if showModal}
	{#if carbonLoaded}
		<!--
			Carbon Web Component Modal
			open attribute = hiện modal, close event = đóng
		-->
		<cds-modal
			open
			onclose={() => showModal = false}
		>
			<cds-modal-header>
				<p class="cds--modal-header__heading">Xác nhận lưu?</p>
			</cds-modal-header>
			<cds-modal-body>
				<p>Bạn có chắc muốn thêm <strong>{form.fullName || 'nhân viên mới'}</strong>?</p>
			</cds-modal-body>
			<cds-modal-footer>
				<cds-button kind="secondary" onclick={() => showModal = false}>Hủy</cds-button>
				<cds-button kind="primary" onclick={confirmSave}>✔ Xác nhận</cds-button>
			</cds-modal-footer>
		</cds-modal>
	{:else}
		<!-- Native modal fallback -->
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div class="modal-overlay" onclick={() => showModal = false}>
			<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
			<div class="modal-panel" onclick={(e) => e.stopPropagation()}>
				<h3 class="modal-title">Xác nhận lưu?</h3>
				<p class="modal-body">Bạn có chắc muốn thêm <strong>{form.fullName || 'nhân viên mới'}</strong>?</p>
				<div class="modal-actions">
					<button class="btn btn-primary" onclick={confirmSave}>✔ Xác nhận</button>
					<button class="btn btn-ghost" onclick={() => showModal = false}>Hủy</button>
				</div>
			</div>
		</div>
	{/if}
{/if}

<style>
	/* ── Layout (giống no-carbon, chủ động không dùng Carbon Grid) ── */
	.shell {
		display: grid;
		grid-template-columns: 220px 1fr;
		grid-template-rows: 100vh;
		overflow: hidden;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
		background: #f8fafc;
		color: #1e293b;
	}

	.sidebar { background: #0f172a; color: #e2e8f0; display: flex; flex-direction: column; overflow-y: auto; }
	.sidebar-logo { display: flex; align-items: center; gap: 0.6rem; padding: 1.25rem 1rem; border-bottom: 1px solid #1e293b; }
	.logo-icon { font-size: 1.4rem; }
	.logo-text { font-size: 0.95rem; font-weight: 700; }
	.sidebar-nav { flex: 1; display: flex; flex-direction: column; padding: 0.75rem 0; }
	.nav-link { display: block; padding: 0.65rem 1rem; color: #94a3b8; text-decoration: none; font-size: 0.85rem; transition: background 0.12s, color 0.12s; }
	.nav-link:hover { background: #1e293b; color: #e2e8f0; }
	.nav-link.active { background: #3b82f620; color: #60a5fa; border-left: 3px solid #3b82f6; }
	.sidebar-footer { padding: 1rem; border-top: 1px solid #1e293b; }
	.back-link { color: #64748b; font-size: 0.8rem; text-decoration: none; }

	.main-area { display: flex; flex-direction: column; overflow: hidden; }
	.topbar { background: #fff; border-bottom: 1px solid #e2e8f0; padding: 0.85rem 1.5rem; display: flex; align-items: center; gap: 1rem; flex-shrink: 0; }
	.topbar-title { margin: 0; font-size: 1rem; font-weight: 700; flex: 1; }
	.topbar-badge { font-size: 0.75rem; background: #dbeafe; color: #1d4ed8; padding: 0.25rem 0.6rem; border-radius: 20px; font-weight: 600; }
	.content { flex: 1; overflow-y: auto; padding: 1.5rem; display: flex; flex-direction: column; gap: 1.5rem; }

	.card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
	.card-header { display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.25rem; border-bottom: 1px solid #f1f5f9; }
	.card-title { margin: 0; font-size: 0.95rem; font-weight: 700; }
	.row-count { font-size: 0.78rem; color: #94a3b8; }

	.table-wrapper { overflow-x: auto; max-height: 420px; overflow-y: auto; }
	.data-table { width: 100%; border-collapse: collapse; font-size: 0.83rem; }
	.data-table thead { position: sticky; top: 0; background: #f8fafc; z-index: 1; }
	.data-table th { padding: 0.6rem 0.9rem; text-align: left; font-size: 0.75rem; text-transform: uppercase; color: #64748b; border-bottom: 2px solid #e2e8f0; font-weight: 600; }
	.data-table td { padding: 0.55rem 0.9rem; border-bottom: 1px solid #f1f5f9; }
	.badge { font-size: 0.72rem; padding: 0.2rem 0.5rem; border-radius: 20px; font-weight: 500; }

	.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; padding: 1.25rem; }
	.field { display: flex; flex-direction: column; gap: 0.35rem; }
	.full-width { grid-column: 1 / -1; }
	.label { font-size: 0.82rem; font-weight: 600; color: #374151; }
	.required { color: #ef4444; }
	.input { padding: 0.55rem 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.875rem; font-family: inherit; background: #fff; color: #1e293b; width: 100%; box-sizing: border-box; }
	.input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px #3b82f620; }

	/* Carbon Select giả (Select trong @carbon/web-components dùng cds-select) */
	.cds-select { padding: 0.55rem 0.75rem; border: 1px solid #8d8d8d; border-radius: 0; font-size: 0.875rem; font-family: IBM Plex Sans, sans-serif; background: #fff; color: #161616; width: 100%; box-sizing: border-box; }

	.form-actions { display: flex; gap: 0.75rem; align-items: center; padding-top: 0.25rem; }
	.alert-success { margin: 0.75rem 1.25rem; padding: 0.75rem 1rem; background: #dcfce7; color: #15803d; border-radius: 8px; font-size: 0.85rem; font-weight: 500; }

	.btn { padding: 0.55rem 1.25rem; border: 1px solid #d1d5db; border-radius: 6px; font-family: inherit; font-size: 0.875rem; font-weight: 500; cursor: pointer; transition: background 0.12s; }
	.btn-primary { background: #3b82f6; border-color: #3b82f6; color: #fff; }
	.btn-primary:hover { background: #2563eb; }
	.btn-ghost { background: #fff; color: #475569; }
	.btn-ghost:hover { background: #f1f5f9; }
	.btn-sm { padding: 0.3rem 0.75rem; font-size: 0.78rem; }

	.perf-panel { border-color: #bfdbfe; }
	.measuring { padding: 1.25rem; color: #64748b; font-size: 0.85rem; margin: 0; }
	.perf-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 1px; background: #f1f5f9; border-top: 1px solid #e2e8f0; }
	.perf-metric { background: #fff; padding: 1rem 1.25rem; display: flex; flex-direction: column; gap: 0.25rem; }
	.perf-metric.good .perf-value { color: #15803d; }
	.perf-metric.warn .perf-value { color: #b45309; }
	.perf-metric.bad  .perf-value { color: #dc2626; }
	.perf-value { font-size: 1.5rem; font-weight: 800; }
	.perf-label { font-size: 0.8rem; font-weight: 600; color: #374151; }
	.perf-hint  { font-size: 0.7rem; color: #94a3b8; font-family: 'SF Mono', Consolas, monospace; }
	.perf-note  { margin: 0; padding: 0.75rem 1.25rem; font-size: 0.82rem; color: #475569; background: #eff6ff; border-top: 1px solid #bfdbfe; }

	.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.45); display: flex; align-items: center; justify-content: center; z-index: 1000; }
	.modal-panel { background: #fff; border-radius: 12px; padding: 2rem; min-width: 320px; max-width: 90vw; box-shadow: 0 20px 60px rgba(0,0,0,.2); }
	.modal-title { margin: 0 0 0.75rem; font-size: 1.1rem; }
	.modal-body  { margin: 0 0 1.5rem; color: #475569; font-size: 0.9rem; line-height: 1.6; }
	.modal-actions { display: flex; gap: 0.75rem; }

	@media (max-width: 700px) {
		.shell { grid-template-columns: 1fr; grid-template-rows: auto 1fr; }
		.sidebar { flex-direction: row; overflow-x: auto; }
		.sidebar-nav { flex-direction: row; }
		.sidebar-footer { display: none; }
		.form-grid { grid-template-columns: 1fr; }
	}
</style>
