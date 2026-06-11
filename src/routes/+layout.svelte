<script lang="ts">
	import './layout.css';
	import { page, navigating } from '$app/stores';
	import { base } from '$app/paths';
	import favicon from '$lib/assets/favicon.svg';
	import { fade } from 'svelte/transition';

	let { children, data } = $props();

	let isBlankPage = $derived(
		$page.url.pathname === '/login' ||
			$page.url.pathname.startsWith('/validasi') ||
			$page.url.pathname.endsWith('/bast')
	);

	// Simple dark flash on navigation — shows for max 1.5 seconds then auto-hides
	let showNavFlash = $state(false);
	let flashTimer: ReturnType<typeof setTimeout> | null = null;

	$effect(() => {
		if ($navigating) {
			showNavFlash = true;
			if (flashTimer) clearTimeout(flashTimer);
			// Auto-dismiss after 1.5s — no more waiting for slow server
			flashTimer = setTimeout(() => {
				showNavFlash = false;
			}, 1500);
		} else {
			// Navigation done — hide quickly
			if (flashTimer) clearTimeout(flashTimer);
			showNavFlash = false;
		}
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link
		href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<svelte:window
	onwheel={(e) => {
		if (document.activeElement?.type === 'number') {
			document.activeElement.blur();
		}
	}}
/>

{#if isBlankPage}
	<div class="flex min-h-screen flex-col bg-[#F5F7FA] font-['Inter',sans-serif] text-gray-800">
		{@render children()}
	</div>
{:else}
	<div
		class="flex h-screen flex-col overflow-hidden bg-[#F5F7FA] font-['Inter',sans-serif] text-gray-800"
	>
		<div class="flex h-screen flex-1 overflow-hidden">
			<!-- Sidebar -->
			<aside
				class="relative z-20 flex w-[280px] flex-shrink-0 flex-col overflow-hidden bg-[#0A417A] text-white shadow-2xl"
			>
				<!-- Geometric Waves Background matching the image -->
				<div class="pointer-events-none absolute inset-0 z-0 overflow-hidden">
					<div
						class="absolute inset-0 bg-gradient-to-b from-[#063261] via-[#0A417A] to-[#0188CE]"
					></div>
					<!-- Diagonal sharp lines (garis) -->
					<svg
						class="absolute inset-0 h-full w-full opacity-25"
						preserveAspectRatio="none"
						viewBox="0 0 100 100"
					>
						<path d="M-20,120 L120,-20 L120,5 L-20,145 Z" fill="url(#shine)"></path>
						<path d="M-10,150 L150,-10 L150,30 L-10,190 Z" fill="url(#shine)"></path>
						<path d="M20,180 L180,20 L180,60 L20,220 Z" fill="url(#shineDark)"></path>
						<defs>
							<linearGradient id="shine" x1="0%" y1="100%" x2="100%" y2="0%">
								<stop offset="0%" stop-color="#ffffff" stop-opacity="0"></stop>
								<stop offset="50%" stop-color="#ffffff" stop-opacity="0.8"></stop>
								<stop offset="100%" stop-color="#ffffff" stop-opacity="0"></stop>
							</linearGradient>
							<linearGradient id="shineDark" x1="0%" y1="100%" x2="100%" y2="0%">
								<stop offset="0%" stop-color="#000000" stop-opacity="0"></stop>
								<stop offset="50%" stop-color="#000000" stop-opacity="0.2"></stop>
								<stop offset="100%" stop-color="#000000" stop-opacity="0"></stop>
							</linearGradient>
						</defs>
					</svg>
				</div>

				<div class="relative z-10 mt-2 flex h-16 items-center border-b border-white/10 px-6">
					<img
						src="/logo-icon.png"
						class="mr-3 h-14 w-auto shrink-0 object-contain drop-shadow-md"
						alt="Logo PLN"
					/>
					<span class="text-xl font-bold tracking-wider"
						>PLN<span class="ml-1 font-medium">Gudang</span></span
					>
				</div>

				<nav class="relative z-10 mt-6 flex flex-1 flex-col space-y-2 overflow-y-auto p-4">
					<a
						href="/"
						class="rounded-lg px-4 py-3 {$page.url.pathname === '/'
							? 'border-l-4 border-yellow-400 bg-white/20 font-semibold shadow-inner'
							: 'text-white/90 hover:bg-white/10'} flex items-center transition-all"
					>
						<svg
							class="mr-3 h-5 w-5 opacity-90"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							><path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
							></path></svg
						>
						Dashboard
					</a>
					<a
						href="/mutasi"
						class="rounded-lg px-4 py-3 {$page.url.pathname.startsWith('/mutasi')
							? 'border-l-4 border-yellow-400 bg-white/20 font-semibold shadow-inner'
							: 'text-white/90 hover:bg-white/10'} flex items-center justify-between transition-all"
					>
						<div class="flex items-center">
							<svg
								class="mr-3 h-5 w-5 opacity-90"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								><path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
								></path></svg
							>
							Transaksi
						</div>
						{#if data.actionCount > 0}
							<span
								class="animate-pulse rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-black text-white shadow-sm"
								>{data.actionCount}</span
							>
						{/if}
					</a>
					<a
						href="/materials"
						class="rounded-lg px-4 py-3 {$page.url.pathname.startsWith('/materials')
							? 'border-l-4 border-yellow-400 bg-white/20 font-semibold shadow-inner'
							: 'text-white/90 hover:bg-white/10'} flex items-center transition-all"
					>
						<svg
							class="mr-3 h-5 w-5 opacity-90"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							><path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
							></path></svg
						>
						Inventory
					</a>
					{#if data.user?.role === 'ADMIN_UP3' || data.user?.role === 'ADMIN_ULP'}
						<a
							href="/usage-tracker"
							class="rounded-lg px-4 py-3 {$page.url.pathname.startsWith('/usage-tracker')
								? 'border-l-4 border-yellow-400 bg-white/20 font-semibold shadow-inner'
								: 'text-white/90 hover:bg-white/10'} flex items-center transition-all"
						>
							<svg
								class="mr-3 h-5 w-5 opacity-90"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								><path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
								/><path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
								/></svg
							>
							Usage Tracker
						</a>
					{/if}
					<a
						href="/laporan"
						class="rounded-lg px-4 py-3 {$page.url.pathname.startsWith('/laporan')
							? 'border-l-4 border-yellow-400 bg-white/20 font-semibold shadow-inner'
							: 'text-white/90 hover:bg-white/10'} flex items-center transition-all"
					>
						<svg
							class="mr-3 h-5 w-5 opacity-90"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							><path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
							></path></svg
						>
						Laporan
					</a>
					<a
						href="/export"
						class="rounded-lg px-4 py-3 {$page.url.pathname.startsWith('/export')
							? 'border-l-4 border-yellow-400 bg-white/20 font-semibold shadow-inner'
							: 'text-white/90 hover:bg-white/10'} flex items-center transition-all"
					>
						<svg
							class="mr-3 h-5 w-5 opacity-90"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							><path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
							></path></svg
						>
						Export Data
					</a>
				</nav>
			</aside>

			<!-- Content Area -->
			<div class="flex min-w-0 flex-1 flex-col overflow-hidden bg-[#F5F7FA]">
				<!-- Topbar / Header matching image -->
				<header
					class="relative z-20 flex h-16 shrink-0 items-center justify-between overflow-hidden px-8 text-white shadow-sm"
				>
					<!-- Geometric Lines Background -->
					<div
						class="pointer-events-none absolute inset-0 z-0 bg-gradient-to-r from-[#0188CE] via-[#0092D1] to-[#0D5BB4]"
					>
						<svg
							class="absolute inset-0 h-full w-full opacity-30"
							preserveAspectRatio="none"
							viewBox="0 0 100 20"
						>
							<path d="M-10,30 L60,-10 L70,-10 L0,30 Z" fill="url(#shineTop)"></path>
							<path d="M20,40 L90,-10 L100,-10 L30,40 Z" fill="url(#shineTop)"></path>
							<defs>
								<linearGradient id="shineTop" x1="0%" y1="100%" x2="100%" y2="0%">
									<stop offset="0%" stop-color="#ffffff" stop-opacity="0"></stop>
									<stop offset="50%" stop-color="#ffffff" stop-opacity="0.6"></stop>
									<stop offset="100%" stop-color="#ffffff" stop-opacity="0"></stop>
								</linearGradient>
							</defs>
						</svg>
					</div>

					<div class="relative z-10 flex items-center text-sm font-medium">
						Selamat Datang, {data.user?.role === 'ADMIN_UP3' ? 'Admin UP3' : data.user?.ulpName}
					</div>

					<div class="relative z-10 flex items-center gap-6">
						<!-- Logout -->
						<form action={`${base}/logout`} method="POST">
							<button
								title="Keluar"
								class="flex items-center justify-center rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
							>
								<svg class="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"
									><path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
									></path></svg
								>
							</button>
						</form>
					</div>
				</header>

				<!-- Main View -->
				<main class="w-full max-w-full flex-1 overflow-x-hidden overflow-y-auto p-6 md:p-8">
					{@render children()}
				</main>
			</div>
		</div>
	</div>
{/if}

{#if showNavFlash}
	<!-- Simple dark flash overlay on page navigation - auto-dismisses in 1.5s -->
	<div
		transition:fade={{ duration: 120 }}
		class="pointer-events-none fixed inset-0 z-[9999] bg-black/25"
	></div>
{/if}
