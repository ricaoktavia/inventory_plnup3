<script lang="ts">
	import { enhance } from '$app/forms';

	let { form } = $props();
</script>

<svelte:head>
	<title>Login - PLN UP3 Madura</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
	<div class="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg border border-gray-100">
		<div>
			<!-- Custom Logo Placeholder for PLN -->
			<div class="mx-auto flex items-center justify-center">
				<img src="/logo-icon.png" class="h-24 w-auto mx-auto mb-4 drop-shadow-lg" alt="Logo PLN" />
			</div>
			<h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
				Portal Inventory PLN
			</h2>
			<p class="mt-2 text-center text-sm text-gray-600">
				UP3 Madura & ULP
			</p>
		</div>

		<form class="mt-8 space-y-6" action="?/login" method="POST" use:enhance>
			<input type="hidden" name="remember" value="true" />
			<div class="rounded-md shadow-sm -space-y-px">
				<div>
					<label for="username" class="sr-only">Username</label>
					<input id="username" name="username" type="text" required class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 focus:z-10 sm:text-sm" placeholder="Username (misal: admin_up3 atau ulp_bangkalan)">
				</div>
				<div>
					<label for="password" class="sr-only">Password</label>
					<input id="password" name="password" type="password" required class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 focus:z-10 sm:text-sm" placeholder="Password">
				</div>
			</div>

			{#if form?.error}
				<div class="text-red-500 text-sm text-center font-medium bg-red-50 p-2 rounded">
					{form.error}
				</div>
			{/if}

			<div>
				<button type="submit" class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-colors">
					<span class="absolute left-0 inset-y-0 flex items-center pl-3">
						<svg class="h-5 w-5 text-cyan-500 group-hover:text-cyan-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
							<path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd" />
						</svg>
					</span>
					Masuk Ke Sistem
				</button>
			</div>
		</form>
	</div>
</div>
