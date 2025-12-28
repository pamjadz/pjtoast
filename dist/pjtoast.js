class PjToast {
	static POSITION_TOP_LEFT = "top-left";
	static POSITION_TOP_CENTER = "top-center";
	static POSITION_TOP_RIGHT = "top-right";
	static POSITION_BOTTOM_LEFT = "bottom-left";
	static POSITION_BOTTOM_CENTER = "bottom-center";
	static POSITION_BOTTOM_RIGHT = "bottom-right";
	static containers = {};
	static stackDelay = 1000;

	constructor(content, options = {}) {
		const defaults = {
			duration: 3000,
			delay: 0,
			position: PjToast.POSITION_BOTTOM_CENTER,
			template: '<div style="background: #323232; color: #fff; padding: 16px 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); min-width: 200px;">%content%</div>',
			progressTemplate: '<div style="position: absolute; bottom: 0; left: 0; height: 3px; background: rgba(255,255,255,0.3); width: %progress%%; transition: width 50ms linear;"></div>',
			dismissible: false,
			showProgress: false,
			context: document.body,
			data: {},
			onShow: null,
			onHide: null,
			onClick: null,
			onProgress: null,
		};
		this.options = { ...defaults, ...options };
		this.content = content;
		this.toastElement = null;
		this.progressElement = null;
		this.timeoutId = null;
		this.progressInterval = null;
		this._injectStyles();
		this.show();
	}

	_parseTemplate(template, data) {
		let result = template;
		Object.keys(data).forEach((key) => {
			const regex = new RegExp(`%${key}%`, "g");
			result = result.replace(regex, data[key] || "");
		});
		return result;
	}

	_buildHTML() {
		let html = "";
		html += this._parseTemplate(this.options.template, {
			content: this.content,
			...this.options.data,
		});
		return html;
	}

	_getContainer() {
		const containerId = `toast-container-${this.options.position}`;
		if( !PjToast.containers[this.options.position] ) {
			const container = document.createElement("div");
			container.id = containerId;
			container.className = "toast-stack-container";
			const posStyles = this._getPositionStyles();
			Object.assign(container.style, {
				position: "fixed",
				zIndex: "9999",
				display: "flex",
				flexDirection: "column",
				gap: "10px",
				...posStyles,
			});
			this.options.context.appendChild(container);
			PjToast.containers[this.options.position] = container;
		}
		return PjToast.containers[this.options.position];
	}

	_getPositionStyles() {
		const positions = {
			[PjToast.POSITION_TOP_LEFT]: { top: "20px", left: "20px" },
			[PjToast.POSITION_TOP_CENTER]: { top: "20px", left: "50%", transform: "translateX(-50%)" },
			[PjToast.POSITION_TOP_RIGHT]: { top: "20px", right: "20px" },
			[PjToast.POSITION_BOTTOM_LEFT]: { bottom: "20px", left: "20px" },
			[PjToast.POSITION_BOTTOM_CENTER]: { bottom: "20px", left: "50%", transform: "translateX(-50%)" },
			[PjToast.POSITION_BOTTOM_RIGHT]: { bottom: "20px", right: "20px" },
		};
		return positions[this.options.position] || positions[PjToast.POSITION_BOTTOM_CENTER];
	}

	_calculateStackDelay() {
		const container = PjToast.containers[this.options.position];
		if( !container ) return 0;
		return container.children.length * PjToast.stackDelay;
	}

	_createElement() {
		const wrapper = document.createElement("div");
		wrapper.className = "toast-wrapper toast-bounce-in";
		if (this.options.showProgress) {
			wrapper.style.position = "relative";
			wrapper.style.overflow = "hidden";
		}
		wrapper.innerHTML = this._buildHTML();
		Object.assign(wrapper.style, {
			pointerEvents: this.options.dismissible ? "auto" : "none",
		});
		if (this.options.dismissible) {
			wrapper.style.cursor = "pointer";
			wrapper.addEventListener("click", () => {
			if (this.options.onClick) this.options.onClick({ toast: this });
				this.hide();
			});
		}
		if (this.options.showProgress) {
			const progressBar = document.createElement("div");
			progressBar.style.cssText = "position: absolute; bottom: 0; left: 0; height: 3px; background: rgba(255,255,255,0.3); width: 0%; transition: width 50ms linear;";
			wrapper.appendChild(progressBar);
			this.progressElement = progressBar;
		}
		return wrapper;
	}

	_startProgress() {
		if (!this.options.showProgress || !this.progressElement) return;
		const startTime = Date.now();
		const totalDuration = this.options.duration + this._calculateStackDelay();
		const updateProgress = () => {
			const elapsed = Date.now() - startTime;
			const progress = Math.min((elapsed / totalDuration) * 100, 100);
			if (this.progressElement) {
			this.progressElement.style.width = `${progress}%`;
			if (this.options.onProgress) this.options.onProgress({ progress, toast: this });
			}
			if (progress < 100 && this.toastElement) {
			this.progressInterval = requestAnimationFrame(updateProgress);
			}
		};
		this.progressInterval = requestAnimationFrame(updateProgress);
	}

	show() {
		if (this.toastElement) return this;
		if (this.options.delay > 0) {
			setTimeout(() => this._showNow(), this.options.delay);
		} else {
			this._showNow();
		}
		return this;
	}

	_showNow() {
		this.toastElement = this._createElement();
		const container = this._getContainer();
		const stackDelay = this._calculateStackDelay();
		container.appendChild(this.toastElement);
		if (this.options.onShow) this.options.onShow({ toast: this });
		this._startProgress();
		this.timeoutId = setTimeout(() => this.hide(), this.options.duration + stackDelay);
	}

	hide() {
		if (!this.toastElement) return this;
		clearTimeout(this.timeoutId);
		if (this.progressInterval) cancelAnimationFrame(this.progressInterval);
		this.toastElement.classList.remove("toast-bounce-in");
		this.toastElement.classList.add("toast-fade-out");
		setTimeout(() => {
			if (this.toastElement && this.toastElement.parentNode) {
			this.toastElement.parentNode.removeChild(this.toastElement);
			const container = PjToast.containers[this.options.position];
			if (container && container.children.length === 0) {
				container.parentNode.removeChild(container);
				delete PjToast.containers[this.options.position];
			}
			}
			this.toastElement = null;
			this.progressElement = null;
			if (this.options.onHide) this.options.onHide({ toast: this });
		}, 500);
		return this;
	}

	_injectStyles() {
		if (document.getElementById("toast-styles")) return;
		const style = document.createElement("style");
		style.id = "toast-styles";
		style.textContent = `@keyframes toastBounceIn{0%{opacity:0;transform:scale(0.3) translateY(-20px);}50% { opacity: 1; transform: scale(1.05) translateY(0); }70% { transform: scale(0.9); }100% { transform: scale(1); }}@keyframes toastFadeOut {0%{opacity: 1;}100%{opacity: 0;}}.toast-bounce-in { animation: toastBounceIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55); }.toast-fade-out { animation: toastFadeOut 0.5s ease-out forwards; }.toast-stack-container { pointer-events: none; }.toast-wrapper { pointer-events: auto; }`;
		document.head.appendChild(style);
	}
}

window.pjtoast = PjToast;