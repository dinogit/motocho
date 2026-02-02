'use client'

import { useState } from 'react'
import { FolderOpen, FileStack, Settings, FileOutput } from 'lucide-react'
import {
    PageHeader,
    PageHeaderContent,
    PageTitle,
    PageDescription,
    PageHeaderSeparator,
} from '@/shared/components/page/page-header'
import { Button } from '@/shared/components/ui/button'
import {
    Stepper,
    StepperList,
    StepperItem,
    StepperTrigger,
    StepperIndicator,
    StepperSeparator,
    StepperTitle,
    StepperContent,
    StepperDescription,
} from '@/shared/components/ui/stepper'
import { DocsProvider, useDocs } from './context/docs-context'
import { StepProject } from './components/step-project'
import { StepSessions } from './components/step-sessions'
import { StepSettings } from './components/step-settings'
import { StepResult } from './components/step-result'

const STEPS = [
    { value: 'project', title: 'Project', description: 'Select Project' },
    { value: 'sessions', title: 'Sessions', description: 'Choose Sessions' },
    { value: 'settings', title: 'Settings', description: 'Configure Settings' },
    { value: 'result', title: 'Result', description: 'View Documentation' },
]

function DocsWizard() {
    const [currentStep, setCurrentStep] = useState('project')
    const { state } = useDocs()

    const canProceed = (step: string): boolean => {
        switch (step) {
            case 'project':
                return true
            case 'sessions':
                return !!state.selectedProjectId
            case 'settings':
                return state.selectedSessionIds.length > 0
            case 'result':
                return state.selectedSessionIds.length > 0
            default:
                return false
        }
    }

    const handleStepChange = (value: string) => {
        // Only allow navigation to steps that are accessible
        const stepIndex = STEPS.findIndex(s => s.value === value)
        const currentIndex = STEPS.findIndex(s => s.value === currentStep)

        // Can always go back
        if (stepIndex < currentIndex) {
            setCurrentStep(value)
            return
        }

        // Can only go forward if current step is complete
        if (canProceed(STEPS[stepIndex - 1]?.value || 'project')) {
            setCurrentStep(value)
        }
    }

    const goToNext = () => {
        const currentIndex = STEPS.findIndex(s => s.value === currentStep)
        if (currentIndex < STEPS.length - 1) {
            const nextStep = STEPS[currentIndex + 1]
            if (canProceed(currentStep)) {
                setCurrentStep(nextStep.value)
            }
        }
    }

    const goToPrev = () => {
        const currentIndex = STEPS.findIndex(s => s.value === currentStep)
        if (currentIndex > 0) {
            setCurrentStep(STEPS[currentIndex - 1].value)
        }
    }

    const currentIndex = STEPS.findIndex(s => s.value === currentStep)
    const isFirstStep = currentIndex === 0
    const isLastStep = currentIndex === STEPS.length - 1

    return (
        <Stepper
            defaultValue="project"
            value={currentStep}
            onValueChange={handleStepChange}
            orientation="horizontal"
        >
            <StepperList>
                {STEPS.map((step) => (
                    <StepperItem key={step.value} value={step.value} className='relative z-0'>
                        <StepperTrigger className="not-last:pb-6">
                            <StepperIndicator />
                            <div className="flex flex-col gap-1">
                                <StepperTitle>{step.title}</StepperTitle>
                                <StepperDescription>{step.description}</StepperDescription>
                            </div>
                        </StepperTrigger>
                        <StepperSeparator className="mx-4" />
                    </StepperItem>
                ))}
            </StepperList>
            {STEPS.map((step) => (
                <StepperContent
                    key={step.value}
                    value={step.value}
                    className="flex flex-col gap-4 rounded-lg border bg-card p-6 text-card-foreground"
                >
                    <div className="flex justify-between">
                        <Button
                            variant="outline"
                            onClick={goToPrev}
                            disabled={isFirstStep}
                        >
                            Back
                        </Button>

                        {!isLastStep && (
                            <Button
                                onClick={goToNext}
                                disabled={!canProceed(currentStep)}
                            >
                                Continue
                            </Button>
                        )}
                    </div>

                    {step.value === 'project' && <StepProject />}
                    {step.value === 'sessions' && <StepSessions />}
                    {step.value === 'settings' && <StepSettings />}
                    {step.value === 'result' && <StepResult />}
                </StepperContent>
            ))}
        </Stepper>
    )
}

export function Page() {
    return (
        <DocsProvider>
            <PageHeader>
                <PageHeaderContent>
                    <PageTitle>Documentation Generator</PageTitle>
                    <PageHeaderSeparator />
                    <PageDescription>
                        Generate project documentation from Claude Code sessions.
                    </PageDescription>
                </PageHeaderContent>
            </PageHeader>

            <div className='p-8'>
                <DocsWizard />
            </div>
        </DocsProvider>
    )
}
