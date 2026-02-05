import Image from "next/image";
import cn from "classnames";
import s from "./Logo.module.scss";

export type Sizes = "S" | "M" | "L";

export type LogoProps = {
  size: Sizes;
};

export default function Logo(props: LogoProps) {
  const style = {
    S: s["pk-logo--S"],
    M: s["pk-logo--M"],
    L: s["pk-logo--L"],
  }[props.size];

  return (
    <Image
      className={cn(style, s["pk-logo"])}
      src="/logo.png"
      alt="Platomico"
      width={444}
      height={115}
      priority
    />
  );
}
