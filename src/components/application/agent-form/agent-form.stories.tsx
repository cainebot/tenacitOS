import type { Meta, StoryObj } from "@storybook/react";
import { AgentForm } from "./agent-form";

const meta: Meta<typeof AgentForm> = {
  title: "Phase69/AgentForm",
  component: AgentForm,
  parameters: {
    layout: "padded",
  },
};

export default meta;
type Story = StoryObj<typeof AgentForm>;

const noopSubmit = async () => {
  await new Promise((r) => setTimeout(r, 300));
};

export const Empty: Story = {
  name: "Empty (create)",
  args: {
    mode: "create",
    onSubmit: noopSubmit,
  },
};

export const Populated: Story = {
  name: "Populated (edit)",
  args: {
    mode: "edit",
    onSubmit: noopSubmit,
    initial: {
      name: "Jax",
      slug: "jax",
      soul_content: "# Jax — SOUL.md\n\nProspector agent on the CircOS mesh.",
      avatar_url: "",
      role: "specialist",
      adapter_type: "codex",
    },
  },
};

export const Submitting: Story = {
  args: {
    mode: "create",
    submitting: true,
    onSubmit: noopSubmit,
    initial: {
      name: "Zooble",
      slug: "zooble",
    },
  },
};

export const Error: Story = {
  args: {
    mode: "create",
    errorMessage: "Server rejected the payload: slug already taken.",
    onSubmit: noopSubmit,
    initial: {
      name: "Jax",
      slug: "jax",
    },
  },
};

export const ReadOnly: Story = {
  name: "ReadOnly (pending approval locked)",
  args: {
    mode: "edit",
    readOnly: true,
    onSubmit: noopSubmit,
    initial: {
      name: "Kinger",
      slug: "kinger",
      soul_content: "# Kinger — SOUL.md\n\nLocked while the update approval resolves.",
      avatar_url: "",
      role: "specialist",
      adapter_type: "codex",
    },
  },
};
