/** Ein Event gilt als unsichtbar, wenn es selbst oder seine Eventreihe auf "hidden" gesetzt ist. */
export function isEventHidden(event: { hidden: boolean; series?: { hidden: boolean } | null }): boolean {
  return event.hidden || !!event.series?.hidden;
}
