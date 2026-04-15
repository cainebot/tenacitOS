import type { Meta, StoryObj } from "@storybook/react"
import { useForm } from "react-hook-form"
import { Button } from "../buttons/button"
import { Input } from "../input/input"
import { HookForm, FormField } from "./hook-form"

type FormValues = { email: string; name: string }

const Demo = () => {
  const form = useForm<FormValues>({ defaultValues: { email: "", name: "" } })

  return (
    <HookForm form={form} onSubmit={form.handleSubmit((values) => console.log(values))} className="flex w-80 flex-col gap-4">
      <FormField name="name" control={form.control}>
        {({ field, fieldState }) => (
          <Input
            label="Full name"
            placeholder="Olivia Rhye"
            value={field.value}
            onChange={(v) => field.onChange(v)}
            isInvalid={!!fieldState.error}
            hint={fieldState.error?.message}
          />
        )}
      </FormField>
      <FormField name="email" control={form.control}>
        {({ field, fieldState }) => (
          <Input
            label="Email"
            placeholder="olivia@untitledui.com"
            value={field.value}
            onChange={(v) => field.onChange(v)}
            isInvalid={!!fieldState.error}
            hint={fieldState.error?.message}
          />
        )}
      </FormField>
      <Button type="submit">Submit</Button>
    </HookForm>
  )
}

const meta: Meta = {
  title: "Base/HookForm",
  parameters: { layout: "centered" },
}

export default meta
type Story = StoryObj

export const Default: Story = { render: () => <Demo /> }
