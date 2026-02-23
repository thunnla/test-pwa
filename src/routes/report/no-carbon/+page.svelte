<!-- ============================================================
     /report/no-carbon
     Giao diện tự build hoàn toàn bằng CSS Grid.
     Không load thư viện bên ngoài — đây là baseline benchmark.
     ============================================================ -->
<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';

	// ── Dữ liệu bảng: 100 dòng nhân viên giả ──────────────────────────
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
	let form = $state({
		fullName:   '',
		email:      '',
		department: '',
		position:   '',
		startDate:  '',
		phone:      ''
	});

	// ── Modal state ────────────────────────────────────────────────────
	let showModal = $state(false);
	let saved      = $state(false);

	function handleSubmit() {
		showModal = true; // Mở modal xác nhận trước khi lưu
	}

	function confirmSave() {
		saved      = true;
		showModal  = false;
		// Reset form sau khi lưu
		form = { fullName: '', email: '', department: '', position: '', startDate: '', phone: '' };
		setTimeout(() => (saved = false), 3000);
	}

	// ── Performance measurement ──────────────────────────────────────
	interface PerfReport {
		totalJsKB:    number;
		dclTime:      number;  // ms từ navigationStart → DOMContentLoaded
		longTaskCount: number;
		maxLongTaskMs: number;
		jsFileCount:  number;
		measured:     boolean;
	}

	let perf = $state<PerfReport>({
		totalJsKB: 0, dclTime: 0, longTaskCount: 0, maxLongTaskMs: 0, jsFileCount: 0, measured: false
	});

	// Biến tích lũy long tasks (cập nhật bất đồng bộ qua PerformanceObserver)
	let _longCount = 0;
	let _maxLong   = 0;

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
				// Không cleanup observer — để đo suốt phiên làm việc
			} catch {
				// longtask API không được hỗ trợ trên tất cả trình duyệt (Safari)
			}
		}

		// 2. Đo sau 1 giây để đảm bảo resource đã load xong
		setTimeout(measureAndReport, 1000);
	});

	function measureAndReport() {
		// Lấy tất cả resource đã được tải
		const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];

		// Lọc chỉ JS files
		const jsResources = resources.filter(
			(r) => r.initiatorType === 'script' || r.name.endsWith('.js')
		);

		// Cộng dồn kích thước (transferSize = kích thước qua mạng, có gzip)
		const totalBytes = jsResources.reduce(
			(sum, r) => sum + (r.transferSize || r.encodedBodySize || 0),
			0
		);

		// Lấy DCL từ PerformanceNavigationTiming
		const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
		const nav = navEntries[0];
		const dclTime = nav ? Math.round(nav.domContentLoadedEventEnd - nav.startTime) : 0;

		perf = {
			totalJsKB:    Math.round(totalBytes / 1024),
			dclTime,
			longTaskCount: _longCount,
			maxLongTaskMs: Math.round(_maxLong),
			jsFileCount:  jsResources.length,
			measured:     true
		};
	}

	// Màu badge status
	function statusColor(s: string): string {
		if (s === 'Nghỉ phép') return '#f59e0b';
		if (s === 'Thử việc')  return '#8b5cf6';
		return '#22c55e';
	}
</script>

<svelte:head>
	<title>No Carbon — Benchmark</title>
	<!-- Không load thêm CSS hay JS từ CDN ở đây -->
</svelte:head>

<!-- ── App shell: CSS Grid layout ── -->
<div class="shell">

	<!-- Sidebar -->
	<aside class="sidebar">
		<div class="sidebar-logo">
			<span class="logo-icon">🟢</span>
			<span class="logo-text">No Carbon</span>
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

	<!-- Main area -->
	<div class="main-area">

		<!-- Header -->
		<header class="topbar">
			<h1 class="topbar-title">Benchmark — No Carbon (Pure CSS Grid)</h1>
			<span class="topbar-badge">Baseline: 0 KB extra JS</span>
		</header>

		<!-- Scrollable content -->
		<div class="content" id="dashboard">

			<!-- ── Bảng 100 dòng ── -->
			<section class="card" id="employees">
				<div class="card-header">
					<h2 class="card-title">Danh sách nhân viên (100 dòng)</h2>
					<span class="row-count">{tableRows.length} bản ghi</span>
				</div>
				<div class="table-wrapper">
					<table class="data-table">
						<thead>
							<tr>
								<th>#</th>
								<th>Họ và tên</th>
								<th>Phòng ban</th>
								<th>Vị trí</th>
								<th>Lương</th>
								<th>Trạng thái</th>
							</tr>
						</thead>
						<tbody>
							{#each tableRows as row}
								<tr>
									<td class="id-cell">{row.id}</td>
									<td class="name-cell">{row.name}</td>
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
			</section>

			<!-- ── Form 6 input ── -->
			<section class="card" id="add">
				<div class="card-header">
					<h2 class="card-title">Thêm nhân viên mới</h2>
				</div>

				{#if saved}
					<div class="alert-success">✅ Đã lưu thành công!</div>
				{/if}

				<form class="form-grid" onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
					<!-- Input 1: Họ tên -->
					<div class="field">
						<label class="label" for="nc-name">Họ và tên <span class="required">*</span></label>
						<input
							id="nc-name"
							class="input"
							type="text"
							placeholder="Nguyễn Văn A"
							bind:value={form.fullName}
							required
						/>
					</div>

					<!-- Input 2: Email -->
					<div class="field">
						<label class="label" for="nc-email">Email <span class="required">*</span></label>
						<input
							id="nc-email"
							class="input"
							type="email"
							placeholder="example@company.com"
							bind:value={form.email}
							required
						/>
					</div>

					<!-- Input 3: Phòng ban -->
					<div class="field">
						<label class="label" for="nc-dept">Phòng ban</label>
						<select id="nc-dept" class="input" bind:value={form.department}>
							<option value="">— Chọn phòng ban —</option>
							{#each DEPARTMENTS as d}<option value={d}>{d}</option>{/each}
						</select>
					</div>

					<!-- Input 4: Vị trí -->
					<div class="field">
						<label class="label" for="nc-pos">Vị trí</label>
						<select id="nc-pos" class="input" bind:value={form.position}>
							<option value="">— Chọn vị trí —</option>
							{#each POSITIONS as p}<option value={p}>{p}</option>{/each}
						</select>
					</div>

					<!-- Input 5: Ngày bắt đầu -->
					<div class="field">
						<label class="label" for="nc-date">Ngày bắt đầu</label>
						<input id="nc-date" class="input" type="date" bind:value={form.startDate} />
					</div>

					<!-- Input 6: Số điện thoại -->
					<div class="field">
						<label class="label" for="nc-phone">Số điện thoại</label>
						<input
							id="nc-phone"
							class="input"
							type="tel"
							placeholder="0901 234 567"
							bind:value={form.phone}
						/>
					</div>

					<!-- Nút action chính -->
					<div class="field full-width form-actions">
						<button type="submit" class="btn btn-primary">💾 Lưu nhân viên</button>
						<button type="button" class="btn btn-ghost" onclick={() => form = { fullName:'',email:'',department:'',position:'',startDate:'',phone:'' }}>
							Xóa form
						</button>
					</div>
				</form>
			</section>

			<!-- ── Performance Report Panel ── -->
			<section class="card perf-panel" id="perf">
				<div class="card-header">
					<h2 class="card-title">📊 Performance Report</h2>
					<button class="btn btn-sm" onclick={measureAndReport}>Đo lại</button>
				</div>

				{#if !perf.measured}
					<p class="measuring">Đang đo... (sau 1 giây)</p>
				{:else}
					<div class="perf-grid">
						<div class="perf-metric good">
							<div class="perf-value">{perf.totalJsKB} KB</div>
							<div class="perf-label">Tổng JS đã tải</div>
							<div class="perf-hint">Từ performance.getEntriesByType('resource')</div>
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
							<div class="perf-hint">Max duration của single long task</div>
						</div>
						<div class="perf-metric">
							<div class="perf-value">{perf.jsFileCount}</div>
							<div class="perf-label">Số file JS</div>
							<div class="perf-hint">Script resources được tải</div>
						</div>
					</div>
					<p class="perf-note">
						💡 <strong>No Carbon baseline:</strong> Tổng JS = JS của SvelteKit app. Không có thư viện ngoài.
					</p>
				{/if}
			</section>

		</div>
	</div>
</div>

<!-- ── Modal xác nhận ── -->
{#if showModal}
	<!-- Overlay -->
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="modal-overlay" onclick={() => showModal = false}>
		<!-- Panel — ngăn click lan ra overlay -->
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div class="modal-panel" onclick={(e) => e.stopPropagation()}>
			<h3 class="modal-title">Xác nhận lưu?</h3>
			<p class="modal-body">
				Bạn có chắc muốn thêm <strong>{form.fullName || 'nhân viên mới'}</strong>?
			</p>
			<div class="modal-actions">
				<button class="btn btn-primary" onclick={confirmSave}>✔ Xác nhận</button>
				<button class="btn btn-ghost" onclick={() => showModal = false}>Hủy</button>
			</div>
		</div>
	</div>
{/if}

<style>
	/* ── Layout: CSS Grid Sidebar ── */
	.shell {
		display: grid;
		grid-template-columns: 220px 1fr;
		grid-template-rows: 100vh;
		overflow: hidden;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
		background: #f8fafc;
		color: #1e293b;
	}

	/* ── Sidebar ── */
	.sidebar {
		background: #0f172a;
		color: #e2e8f0;
		display: flex;
		flex-direction: column;
		overflow-y: auto;
	}
	.sidebar-logo { display: flex; align-items: center; gap: 0.6rem; padding: 1.25rem 1rem; border-bottom: 1px solid #1e293b; }
	.logo-icon { font-size: 1.4rem; }
	.logo-text { font-size: 0.95rem; font-weight: 700; }
	.sidebar-nav { flex: 1; display: flex; flex-direction: column; padding: 0.75rem 0; }
	.nav-link { display: block; padding: 0.65rem 1rem; color: #94a3b8; text-decoration: none; font-size: 0.85rem; transition: background 0.12s, color 0.12s; border-radius: 0; }
	.nav-link:hover { background: #1e293b; color: #e2e8f0; }
	.nav-link.active { background: #22c55e20; color: #22c55e; border-left: 3px solid #22c55e; }
	.sidebar-footer { padding: 1rem; border-top: 1px solid #1e293b; }
	.back-link { color: #64748b; font-size: 0.8rem; text-decoration: none; }
	.back-link:hover { color: #94a3b8; }

	/* ── Main area ── */
	.main-area { display: flex; flex-direction: column; overflow: hidden; }
	.topbar {
		background: #fff;
		border-bottom: 1px solid #e2e8f0;
		padding: 0.85rem 1.5rem;
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-shrink: 0;
	}
	.topbar-title { margin: 0; font-size: 1rem; font-weight: 700; flex: 1; }
	.topbar-badge { font-size: 0.75rem; background: #dcfce7; color: #15803d; padding: 0.25rem 0.6rem; border-radius: 20px; font-weight: 600; white-space: nowrap; }
	.content { flex: 1; overflow-y: auto; padding: 1.5rem; display: flex; flex-direction: column; gap: 1.5rem; }

	/* ── Card ── */
	.card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
	.card-header { display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.25rem; border-bottom: 1px solid #f1f5f9; }
	.card-title { margin: 0; font-size: 0.95rem; font-weight: 700; }
	.row-count { font-size: 0.78rem; color: #94a3b8; }

	/* ── Table ── */
	.table-wrapper { overflow-x: auto; max-height: 420px; overflow-y: auto; }
	.data-table { width: 100%; border-collapse: collapse; font-size: 0.83rem; }
	.data-table thead { position: sticky; top: 0; background: #f8fafc; z-index: 1; }
	.data-table th { padding: 0.6rem 0.9rem; text-align: left; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; color: #64748b; border-bottom: 2px solid #e2e8f0; font-weight: 600; }
	.data-table td { padding: 0.55rem 0.9rem; border-bottom: 1px solid #f1f5f9; }
	.data-table tbody tr:hover { background: #f8fafc; }
	.id-cell { color: #94a3b8; font-variant-numeric: tabular-nums; }
	.name-cell { font-weight: 500; }
	.badge { font-size: 0.72rem; padding: 0.2rem 0.5rem; border-radius: 20px; font-weight: 500; white-space: nowrap; }

	/* ── Form ── */
	.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; padding: 1.25rem; }
	.field { display: flex; flex-direction: column; gap: 0.35rem; }
	.full-width { grid-column: 1 / -1; }
	.label { font-size: 0.82rem; font-weight: 600; color: #374151; }
	.required { color: #ef4444; }
	.input {
		padding: 0.55rem 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		font-size: 0.875rem;
		font-family: inherit;
		transition: border-color 0.12s, box-shadow 0.12s;
		background: #fff;
		color: #1e293b;
		width: 100%;
		box-sizing: border-box;
	}
	.input:focus { outline: none; border-color: #22c55e; box-shadow: 0 0 0 3px #22c55e20; }
	.form-actions { display: flex; gap: 0.75rem; align-items: center; padding-top: 0.25rem; }
	.alert-success { margin: 0.75rem 1.25rem; padding: 0.75rem 1rem; background: #dcfce7; color: #15803d; border-radius: 8px; font-size: 0.85rem; font-weight: 500; }

	/* ── Buttons ── */
	.btn {
		padding: 0.55rem 1.25rem;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		font-family: inherit;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: background 0.12s, border-color 0.12s;
		white-space: nowrap;
	}
	.btn-primary { background: #22c55e; border-color: #22c55e; color: #fff; }
	.btn-primary:hover { background: #16a34a; border-color: #16a34a; }
	.btn-ghost { background: #fff; color: #475569; }
	.btn-ghost:hover { background: #f1f5f9; }
	.btn-sm { padding: 0.3rem 0.75rem; font-size: 0.78rem; }

	/* ── Performance panel ── */
	.perf-panel { border-color: #bfdbfe; }
	.measuring { padding: 1.25rem; color: #64748b; font-size: 0.85rem; margin: 0; }
	.perf-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 1px; background: #f1f5f9; border-top: 1px solid #e2e8f0; }
	.perf-metric { background: #fff; padding: 1rem 1.25rem; display: flex; flex-direction: column; gap: 0.25rem; }
	.perf-metric.good .perf-value  { color: #15803d; }
	.perf-metric.warn .perf-value  { color: #b45309; }
	.perf-metric.bad  .perf-value  { color: #dc2626; }
	.perf-value { font-size: 1.5rem; font-weight: 800; font-variant-numeric: tabular-nums; }
	.perf-label { font-size: 0.8rem; font-weight: 600; color: #374151; }
	.perf-hint  { font-size: 0.7rem; color: #94a3b8; font-family: 'SF Mono', Consolas, monospace; }
	.perf-note  { margin: 0; padding: 0.75rem 1.25rem; font-size: 0.82rem; color: #475569; background: #eff6ff; border-top: 1px solid #bfdbfe; }

	/* ── Modal ── */
	.modal-overlay {
		position: fixed; inset: 0;
		background: rgba(0,0,0,.45);
		display: flex; align-items: center; justify-content: center;
		z-index: 1000;
	}
	.modal-panel {
		background: #fff;
		border-radius: 12px;
		padding: 2rem;
		min-width: 320px;
		max-width: 90vw;
		box-shadow: 0 20px 60px rgba(0,0,0,.2);
	}
	.modal-title { margin: 0 0 0.75rem; font-size: 1.1rem; }
	.modal-body  { margin: 0 0 1.5rem; color: #475569; font-size: 0.9rem; line-height: 1.6; }
	.modal-actions { display: flex; gap: 0.75rem; }

	/* ── Responsive ── */
	@media (max-width: 700px) {
		.shell { grid-template-columns: 1fr; grid-template-rows: auto 1fr; }
		.sidebar { flex-direction: row; overflow-x: auto; white-space: nowrap; }
		.sidebar-nav { flex-direction: row; }
		.sidebar-footer { display: none; }
		.form-grid { grid-template-columns: 1fr; }
	}
</style>
