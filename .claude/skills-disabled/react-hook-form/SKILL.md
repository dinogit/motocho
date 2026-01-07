---
name: react-hook-form
description: Build forms in React using React Hook Form and Zod validation. Use when creating forms with useForm, Controller, or useFieldArray.
---

# React Hook Form with Zod and Shadcn/ui

Build accessible, validated forms in React using React Hook Form with Zod schema validation.

## Core Pattern

```tsx
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

const formSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters."),
  description: z.string().min(20, "Description must be at least 20 characters."),
})

export function MyForm() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  })

  function onSubmit(data: z.infer<typeof formSchema>) {
    console.log(data)
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <Controller
        name="title"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Title</FieldLabel>
            <Input
              {...field}
              id={field.name}
              aria-invalid={fieldState.invalid}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <Button type="submit">Submit</Button>
    </form>
  )
}
```

## Validation Modes

React Hook Form supports different validation modes:

```tsx
const form = useForm<z.infer<typeof formSchema>>({
  resolver: zodResolver(formSchema),
  mode: "onChange", // or "onBlur", "onSubmit", "onTouched", "all"
})
```

| Mode          | Description                                              |
| ------------- | -------------------------------------------------------- |
| `"onChange"`  | Validation triggers on every change.                     |
| `"onBlur"`    | Validation triggers on blur.                             |
| `"onSubmit"`  | Validation triggers on submit (default).                 |
| `"onTouched"` | Validation triggers on first blur, then on every change. |
| `"all"`       | Validation triggers on blur and change.                  |

## Field Types

### Input

Spread the `field` object onto the Input component:

```tsx
<Controller
  name="username"
  control={form.control}
  render={({ field, fieldState }) => (
    <Field data-invalid={fieldState.invalid}>
      <FieldLabel htmlFor={field.name}>Username</FieldLabel>
      <Input
        {...field}
        id={field.name}
        aria-invalid={fieldState.invalid}
      />
      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
    </Field>
  )}
/>
```

### Textarea

```tsx
<Controller
  name="description"
  control={form.control}
  render={({ field, fieldState }) => (
    <Field data-invalid={fieldState.invalid}>
      <FieldLabel htmlFor={field.name}>Description</FieldLabel>
      <Textarea
        {...field}
        id={field.name}
        aria-invalid={fieldState.invalid}
      />
      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
    </Field>
  )}
/>
```

### Select

Use `field.value` and `field.onChange` for Select components:

```tsx
<Controller
  name="language"
  control={form.control}
  render={({ field, fieldState }) => (
    <Field data-invalid={fieldState.invalid}>
      <FieldLabel htmlFor={field.name}>Language</FieldLabel>
      <Select
        name={field.name}
        value={field.value}
        onValueChange={field.onChange}
      >
        <SelectTrigger id={field.name} aria-invalid={fieldState.invalid}>
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="en">English</SelectItem>
          <SelectItem value="es">Spanish</SelectItem>
        </SelectContent>
      </Select>
      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
    </Field>
  )}
/>
```

### Checkbox (Single)

```tsx
<Controller
  name="terms"
  control={form.control}
  render={({ field, fieldState }) => (
    <Field orientation="horizontal" data-invalid={fieldState.invalid}>
      <Checkbox
        id={field.name}
        name={field.name}
        checked={field.value}
        onCheckedChange={field.onChange}
        aria-invalid={fieldState.invalid}
      />
      <FieldLabel htmlFor={field.name}>Accept terms</FieldLabel>
      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
    </Field>
  )}
/>
```

### Checkbox (Array)

Use array manipulation for checkbox groups:

```tsx
<Controller
  name="tasks"
  control={form.control}
  render={({ field, fieldState }) => (
    <FieldSet>
      <FieldLegend>Tasks</FieldLegend>
      <FieldGroup data-slot="checkbox-group">
        {tasks.map((task) => (
          <Field key={task.id} orientation="horizontal" data-invalid={fieldState.invalid}>
            <Checkbox
              id={`task-${task.id}`}
              name={field.name}
              aria-invalid={fieldState.invalid}
              checked={field.value.includes(task.id)}
              onCheckedChange={(checked) => {
                const newValue = checked
                  ? [...field.value, task.id]
                  : field.value.filter((v) => v !== task.id)
                field.onChange(newValue)
              }}
            />
            <FieldLabel htmlFor={`task-${task.id}`}>{task.label}</FieldLabel>
          </Field>
        ))}
      </FieldGroup>
      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
    </FieldSet>
  )}
/>
```

### Radio Group

```tsx
<Controller
  name="plan"
  control={form.control}
  render={({ field, fieldState }) => (
    <FieldSet>
      <FieldLegend>Plan</FieldLegend>
      <RadioGroup
        name={field.name}
        value={field.value}
        onValueChange={field.onChange}
      >
        {plans.map((plan) => (
          <Field key={plan.id} orientation="horizontal" data-invalid={fieldState.invalid}>
            <RadioGroupItem
              value={plan.id}
              id={`plan-${plan.id}`}
              aria-invalid={fieldState.invalid}
            />
            <FieldLabel htmlFor={`plan-${plan.id}`}>{plan.title}</FieldLabel>
          </Field>
        ))}
      </RadioGroup>
      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
    </FieldSet>
  )}
/>
```

### Switch

```tsx
<Controller
  name="twoFactor"
  control={form.control}
  render={({ field, fieldState }) => (
    <Field orientation="horizontal" data-invalid={fieldState.invalid}>
      <FieldContent>
        <FieldLabel htmlFor={field.name}>Two-factor authentication</FieldLabel>
        <FieldDescription>Enable for extra security.</FieldDescription>
        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
      </FieldContent>
      <Switch
        id={field.name}
        name={field.name}
        checked={field.value}
        onCheckedChange={field.onChange}
        aria-invalid={fieldState.invalid}
      />
    </Field>
  )}
/>
```

## Array Fields with useFieldArray

Manage dynamic lists with `useFieldArray`:

```tsx
import { Controller, useFieldArray, useForm } from "react-hook-form"

const formSchema = z.object({
  emails: z
    .array(z.object({ address: z.string().email("Enter a valid email.") }))
    .min(1, "Add at least one email.")
    .max(5, "Maximum 5 emails."),
})

export function EmailForm() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { emails: [{ address: "" }] },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "emails",
  })

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <FieldSet>
        <FieldLegend>Email Addresses</FieldLegend>
        <FieldGroup>
          {fields.map((field, index) => (
            <Controller
              key={field.id}  // Important: use field.id as key
              name={`emails.${index}.address`}
              control={form.control}
              render={({ field: controllerField, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <Input
                    {...controllerField}
                    id={`email-${index}`}
                    aria-invalid={fieldState.invalid}
                    type="email"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => remove(index)}
                    disabled={fields.length <= 1}
                  >
                    Remove
                  </Button>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          ))}
        </FieldGroup>
        <Button
          type="button"
          variant="outline"
          onClick={() => append({ address: "" })}
          disabled={fields.length >= 5}
        >
          Add Email
        </Button>
      </FieldSet>
    </form>
  )
}
```

## useFieldArray Methods

- `append(item)` - Add item to end of array
- `prepend(item)` - Add item to start of array
- `insert(index, item)` - Insert item at index
- `remove(index)` - Remove item at index
- `swap(indexA, indexB)` - Swap two items
- `move(from, to)` - Move item from one index to another
- `update(index, item)` - Update item at index
- `replace(items)` - Replace entire array

## Form Actions

```tsx
// Reset form to default values
<Button type="button" variant="outline" onClick={() => form.reset()}>
  Reset
</Button>

// Submit form
<Button type="submit">Submit</Button>

// Check form state
form.formState.isSubmitting  // true during submission
form.formState.isValid       // true if form is valid
form.formState.isDirty       // true if form has been modified
```

## Accessibility Checklist

1. Add `id` and `htmlFor` to link labels to inputs
2. Add `aria-invalid={fieldState.invalid}` to form controls
3. Add `data-invalid={fieldState.invalid}` to Field wrapper for styling
4. Use `FieldDescription` for help text
5. Use `FieldError` to display validation errors
6. Spread `{...field}` onto inputs to include name, value, onChange, onBlur