export interface LibrarySkill {
    id: string
    name: string
    description: string
    content: string
    tags: string[]
    createdAt: string
    updatedAt: string
}

export interface LibrarySearchParams {
    query?: string
    tags?: string[]
}

export interface SaveSkillInput {
    name: string
    description: string
    content: string
    tags: string[]
}
