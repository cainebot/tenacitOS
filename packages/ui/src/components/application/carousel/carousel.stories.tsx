import type { Meta, StoryObj } from "@storybook/react"
import { Carousel } from "./carousel-base"

const slides = [
  { id: 1, bg: "bg-brand-solid", text: "Slide 1" },
  { id: 2, bg: "bg-success-solid", text: "Slide 2" },
  { id: 3, bg: "bg-error-solid", text: "Slide 3" },
  { id: 4, bg: "bg-warning-solid", text: "Slide 4" },
]

const meta: Meta = { title: "Application/Carousel", parameters: { layout: "centered" } }
export default meta
type Story = StoryObj

export const Default: Story = {
  render: () => (
    <Carousel.Root className="w-[600px]">
      <Carousel.Content>
        {slides.map((s) => (
          <Carousel.Item key={s.id}>
            <div className={`${s.bg} flex h-60 items-center justify-center rounded-lg text-white text-3xl font-bold`}>
              {s.text}
            </div>
          </Carousel.Item>
        ))}
      </Carousel.Content>
      <Carousel.PrevTrigger />
      <Carousel.NextTrigger />
      <Carousel.IndicatorGroup>
        {slides.map((s, i) => (
          <Carousel.Indicator key={s.id} index={i} />
        ))}
      </Carousel.IndicatorGroup>
    </Carousel.Root>
  ),
}

export const Autoplay: Story = {
  render: () => (
    <Carousel.Root className="w-[600px]" opts={{ loop: true }}>
      <Carousel.Content>
        {slides.map((s) => (
          <Carousel.Item key={s.id}>
            <div className={`${s.bg} flex h-60 items-center justify-center rounded-lg text-white text-3xl font-bold`}>
              {s.text}
            </div>
          </Carousel.Item>
        ))}
      </Carousel.Content>
      <Carousel.IndicatorGroup>
        {slides.map((s, i) => (
          <Carousel.Indicator key={s.id} index={i} />
        ))}
      </Carousel.IndicatorGroup>
    </Carousel.Root>
  ),
}
