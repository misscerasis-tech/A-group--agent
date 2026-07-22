import { getWorkspaceContext } from "./workspace-context";
import { normalizeWorkspaceContextError } from "./page-context-error";

export async function loadWorkspaceContextSafe() {
  try {
    return {
      context: await getWorkspaceContext(),
      error: null,
    };
  } catch (error) {
    return {
      context: null,
      error: normalizeWorkspaceContextError(error),
    };
  }
}
