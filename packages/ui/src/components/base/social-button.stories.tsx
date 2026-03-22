import type { Meta, StoryObj } from "@storybook/react"
import { SocialButton } from "./buttons/social-button"

const meta: Meta<typeof SocialButton> = {
  title: "Base/SocialButton",
  component: SocialButton,
  tags: ["autodocs"],
  argTypes: {
    social: {
      control: "select",
      options: ["google", "facebook", "apple", "twitter", "figma", "dribble"],
    },
    theme: {
      control: "select",
      options: ["brand", "color", "gray"],
    },
    size: {
      control: "select",
      options: ["sm", "md", "lg", "xl", "2xl"],
    },
  },
}

export default meta
type Story = StoryObj<typeof SocialButton>

export const Google: Story = {
  args: {
    social: "google",
    theme: "color",
    children: "Sign in with Google",
  },
}

export const GoogleBrand: Story = {
  args: {
    social: "google",
    theme: "brand",
    children: "Sign in with Google",
  },
}

export const GoogleGray: Story = {
  args: {
    social: "google",
    theme: "gray",
    children: "Sign in with Google",
  },
}

export const Facebook: Story = {
  args: {
    social: "facebook",
    theme: "brand",
    children: "Sign in with Facebook",
  },
}

export const Apple: Story = {
  args: {
    social: "apple",
    theme: "brand",
    children: "Sign in with Apple",
  },
}

export const Twitter: Story = {
  args: {
    social: "twitter",
    theme: "brand",
    children: "Sign in with Twitter",
  },
}

export const Figma: Story = {
  args: {
    social: "figma",
    theme: "brand",
    children: "Sign in with Figma",
  },
}

export const Dribble: Story = {
  args: {
    social: "dribble",
    theme: "brand",
    children: "Sign in with Dribbble",
  },
}

export const IconOnly: Story = {
  args: {
    social: "google",
    theme: "color",
  },
}

export const Disabled: Story = {
  args: {
    social: "google",
    theme: "color",
    children: "Sign in with Google",
    disabled: true,
  },
}

export const AllSocials: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <SocialButton social="google" theme="color">Sign in with Google</SocialButton>
      <SocialButton social="facebook" theme="brand">Sign in with Facebook</SocialButton>
      <SocialButton social="apple" theme="brand">Sign in with Apple</SocialButton>
      <SocialButton social="twitter" theme="brand">Sign in with Twitter</SocialButton>
      <SocialButton social="figma" theme="brand">Sign in with Figma</SocialButton>
      <SocialButton social="dribble" theme="brand">Sign in with Dribbble</SocialButton>
    </div>
  ),
}
