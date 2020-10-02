const flyOutTemplate = document.createElement('template')
flyOutTemplate.innerHTML = /* HTML */`
<style>
    :host {
        font-family: sans-serif;
        position: relative;
    }
    ::slotted([slot="flyout"]) {
        width: fit-content;
        display: flex;
        flex-direction: column;
        position: absolute;
        background: white;
        top: 2.5rem;
        right: 0;
        padding: 0.5rem;
        z-index: 990;
        box-shadow: 0 0 2px 1px rgba(0,0,0,0.25);
    }
    ::slotted([slot="flyout"][hidden]) {
        display: none;
    }
    .overlay {
        position: fixed;
        width: 100vw;
        height: 100vh;
        left: 0;
        top: 0;
        z-index: 900;
    }
    .hidden {
        display: none;
    }
</style>
<span aria-role="button">
    <slot name="label">
        options
    </slot>    
</span>
<slot name="flyout"></slot>
<div class="overlay hidden"></div>
`
class FlyOut extends HTMLElement {
  constructor () {
    super()
    this.attachShadow({mode: 'open'})
    this.shadowRoot.appendChild(flyOutTemplate.content.cloneNode(true))
    this.button = this.shadowRoot.querySelector('span')
    this._overlay = this.shadowRoot.querySelector('.overlay')
  }

  assignedEl(slotName) {
      return new Promise(res => {
        const slotEl = this.shadowRoot
            .querySelector(`slot[name="${slotName}"]`)
        slotEl
            .addEventListener('slotchange', e => {
                const els = slotEl.assignedNodes()
                res(els[0])
            })
      })
  }

  toggleFlyout(e) {
    e.stopPropagation()
    const target = e.path[0]
    if(this.flyoutEl.hasAttribute('hidden')) {
        this.flyoutEl.removeAttribute('hidden')
        this._overlay.classList.remove('hidden')
    } else if(target === this._overlay) {
        this.flyoutEl.setAttribute('hidden', true)
        this._overlay.classList.add('hidden')
    }
  }

  async connectedCallback () {
    this.flyoutEl = await this.assignedEl('flyout')
    this.toggleFlyout = this.toggleFlyout.bind(this)
    this.addEventListener('click', this.toggleFlyout)
  }
}

customElements.define('fly-out', FlyOut)
