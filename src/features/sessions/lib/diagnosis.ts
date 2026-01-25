import type { SessionHealth } from '@/shared/types/transcripts'

interface Diagnosis {
    title: string
    description: string
    tip: string
}

export function getDiagnosis(health: SessionHealth): Diagnosis | null {
    const { status } = health

    switch (status) {
        case 'healthy':
            return {
                title: 'Session is Healthy',
                description: 'Your interaction cadence is balanced. You are effectively guiding the agent without overwhelming it.',
                tip: 'Keep up the good work! Frequent, clear instructions help maintain context.',
            }
        case 'stalled':
            return {
                title: 'Session Stalled',
                description: 'Activity is very low (less than 2 prompts/hour). You might be stuck or the session is idle.',
                tip: 'If you are stuck, try asking Claude for a summary of where you left off, or check the "Plan" tab.',
            }
        case 'frantic':
            return {
                title: 'Frantic Activity',
                description: 'You are sending messages very rapidly (> 20/hour). This often leads to context thrashing.',
                tip: 'Slow down. Group your instructions into single, comprehensive prompts to let the agent think more deeply.',
            }
        case 'looping':
            return {
                title: 'Agent Looping',
                description: 'The agent is making excessive tool calls per prompt (> 8). It may be retrying failed commands or getting stuck.',
                tip: 'Interrupt the agent. Provide a clear "Stop" command and clarify the exact path or file name it is struggling with.',
            }
        case 'exploding':
            return {
                title: 'Message Explosion',
                description: 'The agent is generating too many message blocks per prompt. This dilutes the context window.',
                tip: 'Restart the session. The current context is likely cluttered with verbose outputs.',
            }
        case 'heavy':
            return {
                title: 'Heavy Token Usage',
                description: 'You are consuming tokens at a massive rate (> 50k tokens/min). Context processing is becoming a bottleneck.',
                tip: 'Check if you are pasting huge files or logs. Use `grep` or specific file reads instead of dumping entire files.',
            }
        case 'expensive':
            return {
                title: 'High Cost Velocity',
                description: 'This session is burning budget quickly (> $0.50/min), likely due to a combination of large context and frequent refreshes.',
                tip: 'Consider starting a fresh session. The cost of re-reading the entire history for every small change is adding up.',
            }
        default:
            return null
    }
}
