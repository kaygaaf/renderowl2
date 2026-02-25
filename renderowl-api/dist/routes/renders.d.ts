import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { type Render } from '../schemas.js';
interface RenderRecord extends Render {
    queue_job_id: string | null;
}
declare const rendersStore: Map<string, RenderRecord>;
declare const projectRendersIndex: Map<string, Set<string>>;
export default function renderRoutes(fastify: FastifyInstance, _opts: FastifyPluginOptions): Promise<void>;
export { rendersStore, projectRendersIndex };
//# sourceMappingURL=renders.d.ts.map