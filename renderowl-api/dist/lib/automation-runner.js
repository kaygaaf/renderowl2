export class AutomationRunner {
    queue;
    executionStore = new Map();
    cleanupInterval = null;
    MAX_EXECUTIONS = 10000; // Maximum executions to store
    TTL_MS = 24 * 60 * 60 * 1000; // 24 hour TTL
    constructor(queue) {
        this.queue = queue;
        this.registerHandlers();
        this.startCleanupInterval();
    }
    registerHandlers() {
        // Handle automation job execution
        this.queue.registerHandler('automation', async (job) => {
            const payload = job.payload;
            await this.executeAutomation(payload.executionId, payload.automation, payload.triggerData);
        });
        // Handle render jobs
        this.queue.registerHandler('render', async (job) => {
            const payload = job.payload;
            await this.executeRender(payload, job);
        });
        // Handle notification jobs
        this.queue.registerHandler('notify', async (job) => {
            const payload = job.payload;
            await this.executeNotification(payload, job);
        });
    }
    // ========================================================================
    // Automation Execution
    // ========================================================================
    async triggerAutomation(automation, triggerData, options = {}) {
        const executionId = `exec_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
        const execution = {
            id: executionId,
            automationId: automation.id,
            projectId: automation.project_id,
            triggerType: automation.trigger.type,
            triggerData,
            status: 'running',
            currentStep: 0,
            totalSteps: automation.actions.length,
            results: [],
            startedAt: new Date().toISOString(),
        };
        this.executionStore.set(executionId, { execution, completedAt: Date.now() });
        // Create job with idempotency key if automation has unique constraints
        const idempotencyKey = options.idempotencyKey || `${automation.id}:${Date.now()}`;
        const job = await this.queue.enqueue(`automation:${automation.project_id}`, 'automation', {
            type: 'automation',
            executionId,
            automation: this.serializeAutomation(automation),
            triggerData,
        }, {
            priority: 'high',
            idempotencyKey,
            steps: ['validate', 'execute_actions', 'cleanup'],
            ...options,
        });
        return { executionId, jobId: job.id };
    }
    async executeAutomation(executionId, automationData, triggerData) {
        const entry = this.executionStore.get(executionId);
        if (!entry) {
            throw new Error(`Execution not found: ${executionId}`);
        }
        const execution = entry.execution;
        const automation = this.deserializeAutomation(automationData);
        try {
            // Execute each action in sequence
            for (let i = 0; i < automation.actions.length; i++) {
                execution.currentStep = i + 1;
                const action = automation.actions[i];
                const startTime = Date.now();
                let result;
                try {
                    const output = await this.executeAction(action, execution, triggerData);
                    result = {
                        step: i + 1,
                        actionType: action.type,
                        status: 'success',
                        output,
                        durationMs: Date.now() - startTime,
                    };
                }
                catch (error) {
                    result = {
                        step: i + 1,
                        actionType: action.type,
                        status: 'failed',
                        error: error.message,
                        durationMs: Date.now() - startTime,
                    };
                    execution.results.push(result);
                    execution.status = 'failed';
                    execution.error = error.message;
                    execution.completedAt = new Date().toISOString();
                    entry.completedAt = Date.now(); // Update cleanup timestamp
                    throw error;
                }
                execution.results.push(result);
            }
            execution.status = 'completed';
            execution.completedAt = new Date().toISOString();
            entry.completedAt = Date.now(); // Update cleanup timestamp
        }
        catch (error) {
            execution.status = 'failed';
            execution.error = error.message;
            execution.completedAt = new Date().toISOString();
            entry.completedAt = Date.now(); // Update cleanup timestamp
            throw error;
        }
    }
    async executeAction(action, execution, triggerData) {
        switch (action.type) {
            case 'render':
                return this.queueRenderAction(action.config, execution, triggerData);
            case 'notify':
                return this.queueNotificationAction(action.config, execution);
            default:
                throw new Error(`Unknown action type: ${action.type}`);
        }
    }
    async queueRenderAction(config, execution, triggerData) {
        const renderId = `rnd_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
        // Template interpolation for input props
        const inputProps = this.interpolateTemplate(config.input_props_template, triggerData);
        const payload = {
            type: 'render',
            projectId: execution.projectId,
            renderId,
            compositionId: config.composition_id,
            inputProps,
            outputSettings: config.output_settings_override ? {
                format: config.output_settings_override.format ?? 'mp4',
                codec: config.output_settings_override.codec ?? 'h264',
                width: config.output_settings_override.width ?? 1080,
                height: config.output_settings_override.height ?? 1920,
                fps: config.output_settings_override.fps ?? 30,
            } : {
                format: 'mp4',
                codec: 'h264',
                width: 1080,
                height: 1920,
                fps: 30,
            },
        };
        const job = await this.queue.enqueue(`renders:${execution.projectId}`, 'render', payload, {
            priority: 'normal',
            maxAttempts: 3,
            steps: ['prepare', 'render', 'upload'],
        });
        return { renderId, jobId: job.id };
    }
    async queueNotificationAction(config, execution) {
        const notificationId = `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
        const payload = {
            type: 'notify',
            channel: config.channel,
            target: config.target,
            template: config.template,
            data: {
                executionId: execution.id,
                automationId: execution.automationId,
                projectId: execution.projectId,
                results: execution.results,
            },
        };
        const job = await this.queue.enqueue('notifications', 'notify', payload, {
            priority: 'normal',
            maxAttempts: 5, // More retries for notifications
            steps: ['send'],
        });
        return { notificationId, jobId: job.id };
    }
    // ========================================================================
    // Job Handlers (called by queue workers)
    // ========================================================================
    async executeRender(payload, job) {
        // This would integrate with the actual render worker
        // For now, we simulate the render process with step state tracking
        const currentStep = job.steps.find(s => s.status === 'running');
        if (currentStep?.name === 'prepare') {
            // Validate assets, download inputs
            this.queue.updateStepState(job.id, 'prepareStarted', new Date().toISOString());
            // Simulate preparation
            await this.simulateWork(100);
            this.queue.updateStepState(job.id, 'prepareCompleted', new Date().toISOString());
            this.queue.updateStepState(job.id, 'assetsValidated', true);
        }
        if (currentStep?.name === 'render') {
            // Actual render work would happen here
            this.queue.updateStepState(job.id, 'renderStarted', new Date().toISOString());
            this.queue.updateStepState(job.id, 'framesTotal', 1800); // 60s @ 30fps
            this.queue.updateStepState(job.id, 'framesRendered', 0);
            // Simulate render progress (in real impl, this would be actual render worker)
            await this.simulateWork(500);
            this.queue.updateStepState(job.id, 'framesRendered', 1800);
            this.queue.updateStepState(job.id, 'renderCompleted', new Date().toISOString());
        }
        if (currentStep?.name === 'upload') {
            // Upload to storage
            this.queue.updateStepState(job.id, 'uploadStarted', new Date().toISOString());
            await this.simulateWork(200);
            this.queue.updateStepState(job.id, 'uploadUrl', `https://storage.renderowl.com/renders/${payload.renderId}.mp4`);
            this.queue.updateStepState(job.id, 'uploadCompleted', new Date().toISOString());
        }
    }
    async executeNotification(payload, job) {
        // This would integrate with actual notification providers
        // For now, we log and simulate
        const logEntry = {
            timestamp: new Date().toISOString(),
            channel: payload.channel,
            target: payload.target,
            template: payload.template,
            data: payload.data,
        };
        this.queue.updateStepState(job.id, 'notificationLog', logEntry);
        this.queue.updateStepState(job.id, 'sentAt', new Date().toISOString());
        // Simulate API call
        await this.simulateWork(50);
        // In real implementation:
        // - Email: Send via SendGrid/AWS SES
        // - Webhook: POST to target URL
        // - Slack: Send via Slack API
    }
    // ========================================================================
    // Helpers
    // ========================================================================
    interpolateTemplate(template, data) {
        const result = {};
        for (const [key, value] of Object.entries(template)) {
            if (typeof value === 'string') {
                result[key] = this.interpolateString(value, data);
            }
            else if (typeof value === 'object' && value !== null) {
                result[key] = this.interpolateTemplate(value, data);
            }
            else {
                result[key] = value;
            }
        }
        return result;
    }
    interpolateString(template, data) {
        return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            const value = data[key];
            return value !== undefined ? String(value) : match;
        });
    }
    serializeAutomation(automation) {
        return JSON.parse(JSON.stringify(automation));
    }
    deserializeAutomation(data) {
        return data;
    }
    simulateWork(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    // ========================================================================
    // Queries
    // ========================================================================
    getExecution(executionId) {
        const entry = this.executionStore.get(executionId);
        return entry?.execution;
    }
    getExecutionsByAutomation(automationId) {
        return Array.from(this.executionStore.values())
            .filter(e => e.execution.automationId === automationId)
            .map(e => e.execution)
            .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
    }
    getRecentExecutions(limit = 50) {
        return Array.from(this.executionStore.values())
            .map(e => e.execution)
            .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
            .slice(0, limit);
    }
    // ========================================================================
    // Cleanup
    // ========================================================================
    startCleanupInterval() {
        // Run cleanup every hour
        this.cleanupInterval = setInterval(() => {
            this.cleanupOldExecutions();
        }, 60 * 60 * 1000);
    }
    cleanupOldExecutions() {
        const now = Date.now();
        let cleaned = 0;
        for (const [id, entry] of this.executionStore) {
            // Remove entries older than TTL
            if (now - entry.completedAt > this.TTL_MS) {
                this.executionStore.delete(id);
                cleaned++;
            }
        }
        // If still over max, remove oldest
        if (this.executionStore.size > this.MAX_EXECUTIONS) {
            const sorted = Array.from(this.executionStore.entries())
                .sort((a, b) => a[1].completedAt - b[1].completedAt);
            const toRemove = sorted.slice(0, this.executionStore.size - this.MAX_EXECUTIONS);
            for (const [id] of toRemove) {
                this.executionStore.delete(id);
                cleaned++;
            }
        }
        if (cleaned > 0) {
            console.log(`[AutomationRunner] Cleaned up ${cleaned} old executions`);
        }
    }
    stopCleanup() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
    }
}
//# sourceMappingURL=automation-runner.js.map