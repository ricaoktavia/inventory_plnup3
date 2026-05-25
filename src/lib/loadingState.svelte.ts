class LoadingState {
	#activeCount = $state(0);
	#message = $state('Memproses...');
	#timeoutId: any = null;

	get isLoading() {
		return this.#activeCount > 0;
	}

	get message() {
		return this.#message;
	}

	start(message = 'Memproses...', maxDuration = 3000) {
		this.#activeCount++;
		this.#message = message;

		if (this.#timeoutId) {
			clearTimeout(this.#timeoutId);
		}

		// Fail-safe: reset loading state if it takes longer than maxDuration
		this.#timeoutId = setTimeout(() => {
			this.reset();
		}, maxDuration);
	}

	stop() {
		if (this.#activeCount > 0) {
			this.#activeCount--;
		}
		if (this.#activeCount === 0 && this.#timeoutId) {
			clearTimeout(this.#timeoutId);
			this.#timeoutId = null;
		}
	}

	reset() {
		this.#activeCount = 0;
		if (this.#timeoutId) {
			clearTimeout(this.#timeoutId);
			this.#timeoutId = null;
		}
	}
}

export const loadingState = new LoadingState();
