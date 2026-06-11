<script lang="ts">
	let { form } = $props();
</script>

<svelte:head>
	<title>Login - PLN UP3 Madura</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
	<div class="w-full max-w-md space-y-8 rounded-xl border border-gray-100 bg-white p-10 shadow-lg">
		<div>
			<!-- Custom Logo Placeholder for PLN -->
			<div class="mx-auto flex items-center justify-center">
				<img src="/logo-icon.png" class="mx-auto mb-4 h-24 w-auto drop-shadow-lg" alt="Logo PLN" />
			</div>
			<h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">Portal Inventory PLN</h2>
			<p class="mt-2 text-center text-sm text-gray-600">UP3 Madura & ULP</p>
		</div>

		<form class="mt-8 space-y-6" method="POST">
			<input type="hidden" name="remember" value="true" />
			<div class="-space-y-px rounded-md shadow-sm">
				<div>
					<label for="username" class="sr-only">Username</label>
					<input
						id="username"
						name="username"
						type="text"
						required
						class="relative block w-full appearance-none rounded-none rounded-t-md border border-gray-300 px-3 py-2 text-center text-gray-900 placeholder-gray-500 focus:z-10 focus:border-cyan-500 focus:ring-cyan-500 focus:outline-none sm:text-sm"
						placeholder="Username"
					/>
				</div>
				<div>
					<label for="password" class="sr-only">Password</label>
					<input
						id="password"
						name="password"
						type="password"
						required
						class="relative block w-full appearance-none rounded-none rounded-b-md border border-gray-300 px-3 py-2 text-center text-gray-900 placeholder-gray-500 focus:z-10 focus:border-cyan-500 focus:ring-cyan-500 focus:outline-none sm:text-sm"
						placeholder="Password"
					/>
				</div>
			</div>

			{#if form?.error}
				<div class="rounded bg-red-50 p-2 text-center text-sm font-medium text-red-500">
					{form.error}
				</div>
			{/if}

			<div>
				<button
					type="submit"
					class="group relative flex w-full justify-center rounded-md border border-transparent bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-700 focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:outline-none"
				>
					<span class="absolute inset-y-0 left-0 flex items-center pl-3">
						<svg
							class="h-5 w-5 text-cyan-500 group-hover:text-cyan-400"
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 20 20"
							fill="currentColor"
							aria-hidden="true"
						>
							<path
								fill-rule="evenodd"
								d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
								clip-rule="evenodd"
							/>
						</svg>
					</span>
					Masuk Ke Sistem
				</button>
			</div>
		</form>
	</div>
</div>
