export function setSeo(title: string, description?: string | null) {
  document.title = title;
  if (description) {
    let el = document.querySelector('meta[name="description"]');
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute('name', 'description');
      document.head.appendChild(el);
    }
    el.setAttribute('content', description);
  }
}
