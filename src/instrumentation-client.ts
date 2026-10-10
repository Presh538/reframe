import posthog from 'posthog-js'

/**
 * Keeps the app alive when something outside React rearranges its DOM.
 *
 * Google Translate, Grammarly, Dark Reader and similar extensions replace text
 * nodes React owns. When React later removes or inserts next to one of them,
 * the browser throws "NotFoundError: Failed to execute 'removeChild' on
 * 'Node'" and the whole tree unmounts -- the user loses the editor and their
 * work over a node they never see. The editor sets translate="no", but that
 * only stops translators, and not every extension honours it.
 *
 * The guard steps in only when the DOM is already inconsistent: the node is
 * not where React believes it is, so there is nothing correct left to do.
 * Removing a node that is already gone is a no-op; inserting before a missing
 * reference node appends instead. Every case is reported, so a real bug in our
 * own DOM code shows up as an event rather than disappearing silently.
 *
 * This is the mitigation suggested in React's issue tracker (facebook/react
 * #11538) for this class of error.
 */
function report(method: string, parent: Node, child: Node | null) {
  const describe = (node: Node | null) =>
    !node ? 'null'
      : node.nodeType === Node.TEXT_NODE ? '#text'
      : `${node.nodeName.toLowerCase()}${node instanceof Element && node.className && typeof node.className === 'string' ? '.' + node.className.split(' ')[0] : ''}`
  try {
    if (posthog.__loaded) {
      posthog.capture('dom_mismatch_recovered', {
        method,
        parent: describe(parent),
        child: describe(child),
        translated: document.documentElement.classList.contains('translated-ltr')
          || document.documentElement.classList.contains('translated-rtl'),
      })
    }
  } catch { /* reporting must never throw */ }
}

if (typeof Node === 'function' && Node.prototype) {
  const removeChild = Node.prototype.removeChild
  Node.prototype.removeChild = function <T extends Node>(this: Node, child: T): T {
    if (child.parentNode !== this) {
      report('removeChild', this, child)
      return child
    }
    return removeChild.call(this, child) as T
  }

  const insertBefore = Node.prototype.insertBefore
  Node.prototype.insertBefore = function <T extends Node>(this: Node, node: T, reference: Node | null): T {
    if (reference && reference.parentNode !== this) {
      report('insertBefore', this, reference)
      return insertBefore.call(this, node, null) as T
    }
    return insertBefore.call(this, node, reference) as T
  }
}
