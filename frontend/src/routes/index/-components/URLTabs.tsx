import styles from "./URLTabs.module.css";
import { type Dispatch, type SetStateAction } from "react";
import {
  type ActiveTabOption,
  type GetShortURLRequest,
  type GetShortURLResponse,
} from "../route";
import type { UseMutateFunction } from "@tanstack/react-query";

import { IconLink, IconQrcode } from "@tabler/icons-react";
import { Tabs, Checkbox } from "radix-ui";

import URLInput from "./URLInput";

interface URLTabsProps {
  tab: ActiveTabOption;
  setTab: Dispatch<SetStateAction<ActiveTabOption>>;
  reset: () => void;

  // For flexibility in choosing what content to show. But not necessary at the moment.
  URLTabContent: React.ReactNode;
  QRCodeTabContent: React.ReactNode;
}

export default function URLTabs({
  tab,
  setTab,
  URLTabContent,
  QRCodeTabContent,
  reset,
}: URLTabsProps) {
  // Remove the short URL result when tab is changed
  const onTabChange = (val: string) => {
    setTab(val as ActiveTabOption);
    reset();
  };

  return (
    <Tabs.Root
      value={tab}
      onValueChange={onTabChange}
      className={styles.tabsRoot}
    >
      <Tabs.List className={styles.tabsList}>
        <Tabs.Trigger className={styles.tabsTrigger} value="short-url">
          <IconLink />
          <span>Short URL</span>
        </Tabs.Trigger>

        <Tabs.Trigger className={styles.tabsTrigger} value="qr-code">
          <IconQrcode />
          <span>QR Code</span>
        </Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content value="short-url">{URLTabContent}</Tabs.Content>

      <Tabs.Content value="qr-code">{QRCodeTabContent}</Tabs.Content>
    </Tabs.Root>
  );
}

interface TabContentProps {
  mutate: UseMutateFunction<
    GetShortURLResponse,
    Error,
    GetShortURLRequest,
    unknown
  >;
  isPending: boolean;
  tab: ActiveTabOption;
  longURL: string;
  setLongURL: Dispatch<SetStateAction<string>>;
  slug: string;
  setSlug: Dispatch<SetStateAction<string>>;
  qrCodeChecked: Checkbox.CheckedState;
  setQrCodeChecked: Dispatch<SetStateAction<Checkbox.CheckedState>>;
}

export function TabContent({
  mutate,
  isPending,
  tab,
  longURL,
  setLongURL,
  slug,
  setSlug,
  qrCodeChecked,
  setQrCodeChecked,
}: TabContentProps) {
  return (
    <URLInput
      longURL={longURL}
      setLongURL={setLongURL}
      slug={slug}
      setSlug={setSlug}
      onSubmit={mutate}
      isPending={isPending}
      tab={tab}
      qrCodeChecked={qrCodeChecked}
      setQrCodeChecked={setQrCodeChecked}
    />
  );
}
