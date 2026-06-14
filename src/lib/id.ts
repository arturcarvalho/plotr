/** Short random id for layers/labels/custom cards. Collision-tolerant: ids are
 *  scoped to a single in-memory chart config, not a global namespace. */
export const newId = () => Math.random().toString(36).slice(2, 9);
