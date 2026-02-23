<!-- ============================================================
     /report — Landing page benchmark Carbon Design System
     Mục tiêu: Giới thiệu mục đích, điều hướng 3 mode, hướng dẫn sếp.
     Không import bất kỳ thư viện nào — trang này thuần SvelteKit.
     ============================================================ -->
<script lang="ts">
	import { goto } from '$app/navigation';

	// Thông tin 3 mode benchmark
	const modes = [
		{
			id: 'no-carbon',
			title: 'No Carbon',
			path: '/report/no-carbon',
			color: '#22c55e',
			bg: '#f0fdf4',
			border: '#86efac',
			description: 'Giao diện tự build bằng CSS Grid. Không load thêm thư viện nào.',
			badge: 'Nhẹ nhất',
			badgeColor: '#15803d',
			badgeBg: '#dcfce7',
			expected: '~0 KB extra JS'
		},
		{
			id: 'carbon-essential',
			title: 'Carbon Essential',
			path: '/report/carbon-essential',
			color: '#3b82f6',
			bg: '#eff6ff',
			border: '#93c5fd',
			description: 'Chỉ load CSS + 4 component Carbon cần thiết (DataTable, TextInput, Modal, Button) qua CDN trong onMount.',
			badge: 'Cân bằng',
			badgeColor: '#1d4ed8',
			badgeBg: '#dbeafe',
			expected: '~300–400 KB extra'
		},
		{
			id: 'carbon-full',
			title: 'Carbon Full',
			path: '/report/carbon-full',
			color: '#f59e0b',
			bg: '#fffbeb',
			border: '#fcd34d',
			description: 'Load toàn bộ Carbon Web Components bundle + Carbon CSS global theme.',
			badge: 'Nặng nhất',
			badgeColor: '#b45309',
			badgeBg: '#fef9c3',
			expected: '~1 MB+ extra'
		}
	] as const;

	// Hướng dẫn test cho sếp
	const instructions = [
		{
			step: 1,
			icon: '🔄',
			title: 'Refresh trang trước khi đo',
			detail: 'Nhấn Ctrl+Shift+R (hard refresh) để xóa cache của trang cũ trước khi chuyển sang mode mới.'
		},
		{
			step: 2,
			icon: '📊',
			title: 'Xem Performance Report',
			detail: 'Cuộn xuống cuối mỗi trang để thấy panel "Performance Report" hiển thị JS load, thời gian, long tasks.'
		},
		{
			step: 3,
			icon: '📱',
			title: 'Test trên mobile thật',
			detail: 'Kết quả trên điện thoại sẽ khác biệt rõ hơn — CPU mobile yếu hơn laptop nên long tasks sẽ nhiều hơn.'
		},
		{
			step: 4,
			icon: '↕️',
			title: 'Scroll bảng 100 dòng',
			detail: 'Thử scroll bảng dữ liệu. So sánh độ mượt giữa 3 mode — Carbon Full có thể bị giật trên điện thoại cũ.'
		},
		{
			step: 5,
			icon: '🧪',
			title: 'So sánh DevTools',
			detail: 'Mở F12 → Network → lọc "JS". Carbon Full sẽ load nhiều file JS hơn đáng kể so với No Carbon.'
		}
	];
</script>

<svelte:head>
	<title>Benchmark Report — Carbon Design System</title>
</svelte:head>

<div class="page">
	<!-- Header -->
	<header class="header">
		<div class="header-inner">
			<span class="header-logo">⚡</span>
			<div>
				<h1 class="header-title">Carbon Design System — Performance Benchmark</h1>
				<p class="header-sub">So sánh hiệu năng thực tế giữa 3 cách tiếp cận UI</p>
			</div>
		</div>
	</header>

	<main class="main">
		<!-- Mục đích -->
		<section class="section">
			<h2 class="section-title">🎯 Mục đích</h2>
			<div class="purpose-card">
				<p>
					Trang này dùng để <strong>chứng minh bằng số liệu thực</strong> rằng việc sử dụng Carbon Design System
					ảnh hưởng đến performance của ứng dụng như thế nào — cụ thể là tổng lượng JS tải về,
					thời gian render, và số lượng "long tasks" (tác vụ chặn UI ≥ 50ms).
				</p>
				<p style="margin-top: 0.75rem;">
					Mỗi mode dưới đây render <strong>cùng một UI</strong>: sidebar, header, bảng 100 dòng,
					form 6 trường, modal xác nhận — nhưng dùng stack công nghệ khác nhau.
				</p>
				<div class="metric-legend">
					<div class="legend-item"><span class="dot green"></span>JS nhỏ → Load nhanh, ít chặn UI</div>
					<div class="legend-item"><span class="dot red"></span>JS lớn → Load chậm, nhiều long tasks</div>
				</div>
			</div>
		</section>

		<!-- 3 Mode cards -->
		<section class="section">
			<h2 class="section-title">🚀 Chọn Mode để Benchmark</h2>
			<div class="mode-grid">
				{#each modes as mode}
					<button
						class="mode-card"
						style="--card-color:{mode.color};--card-bg:{mode.bg};--card-border:{mode.border};"
						onclick={() => goto(mode.path)}
					>
						<div class="mode-card-header">
							<h3 class="mode-card-title">{mode.title}</h3>
							<span class="mode-badge" style="color:{mode.badgeColor};background:{mode.badgeBg};">
								{mode.badge}
							</span>
						</div>
						<p class="mode-card-desc">{mode.description}</p>
						<div class="mode-card-footer">
							<code class="mode-expected">{mode.expected}</code>
							<span class="mode-arrow">→</span>
						</div>
					</button>
				{/each}
			</div>
		</section>

		<!-- Hướng dẫn test -->
		<section class="section">
			<h2 class="section-title">📋 Hướng dẫn Test</h2>
			<div class="steps">
				{#each instructions as ins}
					<div class="step">
						<div class="step-icon">{ins.icon}</div>
						<div class="step-content">
							<div class="step-num">Bước {ins.step}</div>
							<div class="step-title">{ins.title}</div>
							<div class="step-detail">{ins.detail}</div>
						</div>
					</div>
				{/each}
			</div>
		</section>

		<!-- What we measure -->
		<section class="section">
			<h2 class="section-title">📐 Chúng ta đo gì?</h2>
			<div class="metrics-grid">
				<div class="metric-card">
					<div class="metric-icon">💾</div>
					<div class="metric-name">Tổng JS (KB)</div>
					<div class="metric-desc">Toàn bộ JS file được tải qua <code>performance.getEntriesByType('resource')</code></div>
				</div>
				<div class="metric-card">
					<div class="metric-icon">⏱️</div>
					<div class="metric-name">DCL Time (ms)</div>
					<div class="metric-desc">Thời gian từ <code>navigationStart</code> đến <code>DOMContentLoaded</code></div>
				</div>
				<div class="metric-card">
					<div class="metric-icon">🔴</div>
					<div class="metric-name">Long Tasks</div>
					<div class="metric-desc">Số tác vụ chặn UI ≥ 50ms, đo bằng <code>PerformanceObserver</code></div>
				</div>
				<div class="metric-card">
					<div class="metric-icon">📁</div>
					<div class="metric-name">JS Files</div>
					<div class="metric-desc">Số file .js riêng biệt được tải về từ tất cả nguồn</div>
				</div>
			</div>
		</section>
	</main>

	<footer class="footer">
		Benchmark nội bộ — SvelteKit + Performance API — {new Date().getFullYear()}
	</footer>
</div>

<style>
	/* ── Reset & base ── */
	:global(body) { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; color: #1e293b; }

	.page {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	/* ── Header ── */
	.header {
		background: #0f172a;
		color: #fff;
		padding: 1.25rem 2rem;
		position: sticky;
		top: 0;
		z-index: 10;
		box-shadow: 0 2px 8px rgba(0,0,0,.3);
	}
	.header-inner { display: flex; align-items: center; gap: 1rem; max-width: 1000px; margin: 0 auto; }
	.header-logo { font-size: 2rem; }
	.header-title { margin: 0; font-size: 1.2rem; font-weight: 700; }
	.header-sub { margin: 0.2rem 0 0; font-size: 0.85rem; color: #94a3b8; }

	/* ── Main ── */
	.main { flex: 1; max-width: 1000px; width: 100%; margin: 0 auto; padding: 2rem 1.5rem; display: flex; flex-direction: column; gap: 2.5rem; }
	.section { display: flex; flex-direction: column; gap: 1rem; }
	.section-title { margin: 0; font-size: 1.05rem; font-weight: 700; color: #334155; }

	/* ── Purpose card ── */
	.purpose-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem; font-size: 0.9rem; line-height: 1.7; color: #475569; }
	.metric-legend { display: flex; gap: 1.5rem; margin-top: 1rem; flex-wrap: wrap; }
	.legend-item { display: flex; align-items: center; gap: 0.4rem; font-size: 0.82rem; color: #475569; }
	.dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; flex-shrink: 0; }
	.dot.green { background: #22c55e; }
	.dot.red { background: #ef4444; }

	/* ── Mode cards ── */
	.mode-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; }
	.mode-card {
		background: var(--card-bg);
		border: 2px solid var(--card-border);
		border-radius: 12px;
		padding: 1.25rem;
		text-align: left;
		cursor: pointer;
		transition: transform 0.15s, box-shadow 0.15s;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	.mode-card:hover { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(0,0,0,.1); }
	.mode-card-header { display: flex; align-items: center; justify-content: space-between; }
	.mode-card-title { margin: 0; font-size: 1rem; font-weight: 700; color: var(--card-color); }
	.mode-badge { font-size: 0.72rem; font-weight: 600; padding: 0.2rem 0.5rem; border-radius: 20px; }
	.mode-card-desc { margin: 0; font-size: 0.84rem; line-height: 1.6; color: #475569; }
	.mode-card-footer { display: flex; justify-content: space-between; align-items: center; }
	.mode-expected { font-family: 'SF Mono', Consolas, monospace; font-size: 0.8rem; color: #64748b; background: rgba(0,0,0,.05); padding: 0.2rem 0.4rem; border-radius: 4px; }
	.mode-arrow { font-size: 1.1rem; color: var(--card-color); font-weight: 700; }

	/* ── Steps ── */
	.steps { display: flex; flex-direction: column; gap: 0.75rem; }
	.step { display: flex; align-items: flex-start; gap: 1rem; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 1rem 1.25rem; }
	.step-icon { font-size: 1.4rem; flex-shrink: 0; line-height: 1; }
	.step-content { display: flex; flex-direction: column; gap: 0.15rem; }
	.step-num { font-size: 0.72rem; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
	.step-title { font-size: 0.92rem; font-weight: 600; color: #1e293b; }
	.step-detail { font-size: 0.83rem; color: #64748b; line-height: 1.5; }

	/* ── Metrics grid ── */
	.metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; }
	.metric-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 1.25rem; display: flex; flex-direction: column; gap: 0.5rem; }
	.metric-icon { font-size: 1.5rem; }
	.metric-name { font-size: 0.87rem; font-weight: 700; color: #1e293b; }
	.metric-desc { font-size: 0.78rem; color: #64748b; line-height: 1.5; }
	.metric-desc code { background: #f1f5f9; padding: 0.1rem 0.3rem; border-radius: 3px; font-family: 'SF Mono', Consolas, monospace; font-size: 0.72rem; }

	/* ── Footer ── */
	.footer { text-align: center; padding: 1.5rem; font-size: 0.78rem; color: #94a3b8; border-top: 1px solid #e2e8f0; background: #fff; }

	/* ── Responsive ── */
	@media (max-width: 600px) {
		.header { padding: 1rem; }
		.main { padding: 1.25rem 1rem; }
		.mode-grid { grid-template-columns: 1fr; }
		.metrics-grid { grid-template-columns: 1fr 1fr; }
	}
</style>
