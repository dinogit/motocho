'use client'


import {PageDescription, PageHeader, PageHeaderContent, PageTitle} from "@/shared/components/page/page-header.tsx";
import {Route} from "@/routes/commands.tsx";
import {CommandCard} from "@/features/commands/components/command-card.tsx";

export function Page() {

  const data = Route.useLoaderData()

  console.log(data)

  if(!data) return (
    <div className="space-y-8">
      No commands found.
    </div>
  )

  return (
      <div className="space-y-8">
        <PageHeader>
          <PageHeaderContent>
            <PageTitle>Commands</PageTitle>
            <PageDescription>
                Explore and manage your CLI commands to enhance your development workflow.
            </PageDescription>
          </PageHeaderContent>
        </PageHeader>
        <div className="p-6 grid gap-6 sm:grid-cols-2">
          { data.commands.map((command) => {
            return (
                <CommandCard
                    key={command.id}
                    command={command}
                />
            )
          })}

        </div>
    </div>
  )
}
