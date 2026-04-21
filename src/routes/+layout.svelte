<script lang="ts">
	import './layout.css';
	import { page } from '$app/stores';
	import favicon from '$lib/assets/favicon.svg';

	let { children, data } = $props();
	
	let isBlankPage = $derived($page.url.pathname === '/login' || $page.url.pathname.startsWith('/validasi'));
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
</svelte:head>

{#if isBlankPage}
	<div class="font-['Inter',sans-serif] min-h-screen bg-[#F5F7FA] text-gray-800 flex flex-col">
		{@render children()}
	</div>
{:else}
	<div class="font-['Inter',sans-serif] h-screen overflow-hidden bg-[#F5F7FA] text-gray-800 flex flex-col">
		<div class="flex flex-1 h-screen overflow-hidden">
			<!-- Sidebar -->
			<aside class="w-[280px] text-white flex flex-col flex-shrink-0 z-20 shadow-2xl relative overflow-hidden bg-[#0A417A]">
				<!-- Geometric Waves Background matching the image -->
				<div class="absolute inset-0 z-0 pointer-events-none overflow-hidden">
					<div class="absolute inset-0 bg-gradient-to-b from-[#063261] via-[#0A417A] to-[#0188CE]"></div>
					<!-- Diagonal sharp lines (garis) -->
					<svg class="absolute inset-0 w-full h-full opacity-25" preserveAspectRatio="none" viewBox="0 0 100 100">
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

				<div class="h-16 flex items-center px-6 relative z-10 border-b border-white/10 mt-2">
					<img src="/logo-icon.png" class="h-14 w-auto object-contain shrink-0 mr-3 drop-shadow-md" alt="Logo PLN" />
					<span class="font-bold text-xl tracking-wider">PLN<span class="font-medium ml-1">Gudang</span></span>
				</div>

				<nav class="p-4 flex flex-col space-y-2 overflow-y-auto flex-1 relative z-10 mt-6">
					<a href="/" class="px-4 py-3 rounded-lg { $page.url.pathname === '/' ? 'bg-white/20 font-semibold shadow-inner border-l-4 border-yellow-400' : 'hover:bg-white/10 text-white/90' } transition-all flex items-center">
						<svg class="w-5 h-5 mr-3 opacity-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
						Dashboard
					</a>
					<a href="/mutasi" class="px-4 py-3 rounded-lg { $page.url.pathname.startsWith('/mutasi') ? 'bg-white/20 font-semibold shadow-inner border-l-4 border-yellow-400' : 'hover:bg-white/10 text-white/90' } transition-all flex items-center">
						<svg class="w-5 h-5 mr-3 opacity-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>
						Transaksi
					</a>
					<a href="/materials" class="px-4 py-3 rounded-lg { $page.url.pathname.startsWith('/materials') ? 'bg-white/20 font-semibold shadow-inner border-l-4 border-yellow-400' : 'hover:bg-white/10 text-white/90' } transition-all flex items-center">
						<svg class="w-5 h-5 mr-3 opacity-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
						Inventory
					</a>
					{#if data.user?.role === 'ADMIN_UP3' || data.user?.role === 'ADMIN_ULP'}
						<a href="/usage-tracker" class="px-4 py-3 rounded-lg { $page.url.pathname.startsWith('/usage-tracker') ? 'bg-white/20 font-semibold shadow-inner border-l-4 border-yellow-400' : 'hover:bg-white/10 text-white/90' } transition-all flex items-center">
							<svg class="w-5 h-5 mr-3 opacity-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
							Usage Tracker
						</a>
					{/if}
					<a href="/laporan" class="px-4 py-3 rounded-lg { $page.url.pathname.startsWith('/laporan') ? 'bg-white/20 font-semibold shadow-inner border-l-4 border-yellow-400' : 'hover:bg-white/10 text-white/90' } transition-all flex items-center">
						<svg class="w-5 h-5 mr-3 opacity-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
						Laporan
					</a>
				</nav>
			</aside>

			<!-- Content Area -->
			<div class="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#F5F7FA]">
				<!-- Topbar / Header matching image -->
				<header class="h-16 shrink-0 flex items-center justify-between px-8 z-20 text-white relative overflow-hidden shadow-sm">
					<!-- Geometric Lines Background -->
					<div class="absolute inset-0 z-0 pointer-events-none bg-gradient-to-r from-[#0188CE] via-[#0092D1] to-[#0D5BB4]">
						<svg class="absolute inset-0 w-full h-full opacity-30" preserveAspectRatio="none" viewBox="0 0 100 20">
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

					<div class="flex items-center text-sm font-medium relative z-10">
						Selamat Datang, {data.user?.role === 'ADMIN_UP3' ? 'Admin UP3' : data.user?.ulpName}
						{#if data.user?.role === 'ADMIN_UP3'}
							<span class="ml-2 px-2 py-0.5 bg-yellow-400 text-[#0A417A] text-xs rounded-full font-bold shadow-sm">Pusat</span>
						{/if}
					</div>
					
					<div class="flex items-center gap-6 relative z-10">
						<!-- Logout -->
						<form action="/logout" method="POST">
							<button title="Keluar" class="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white flex items-center justify-center">
								<svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
							</button>
						</form>
					</div>
				</header>

				<!-- Main View -->
				<main class="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-8 w-full max-w-full">
					{@render children()}
				</main>
			</div>
		</div>
	</div>
{/if}
