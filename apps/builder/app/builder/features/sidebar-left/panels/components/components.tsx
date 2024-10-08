import { useMemo, useState, type FormEvent } from "react";
import { useStore } from "@nanostores/react";
import {
  type WsComponentMeta,
  componentCategories,
} from "@webstudio-is/react-sdk";
import {
  theme,
  Flex,
  ComponentCard,
  ScrollArea,
  List,
  ListItem,
  SearchField,
  Separator,
} from "@webstudio-is/design-system";
import { PlusIcon } from "@webstudio-is/icons";
import { CollapsibleSection } from "~/builder/shared/collapsible-section";
import type { TabContentProps } from "../../types";
import { Header, CloseButton, Root } from "../../shared/panel";
import {
  dragItemAttribute,
  elementToComponentName,
  useDraggable,
} from "./use-draggable";
import { MetaIcon } from "~/builder/shared/meta-icon";
import { $registeredComponentMetas, $selectedPage } from "~/shared/nano-states";
import { getMetaMaps } from "./get-meta-maps";
import { getInstanceLabel } from "~/shared/instance-utils";
import { isFeatureEnabled } from "@webstudio-is/feature-flags";
import { insert } from "./insert";
import { matchSorter } from "match-sorter";

export const TabContent = ({ publish, onSetActiveTab }: TabContentProps) => {
  const metaByComponentName = useStore($registeredComponentMetas);
  const selectedPage = useStore($selectedPage);
  const [searchText, setSearchText] = useState("");
  const documentType = selectedPage?.meta.documentType ?? "html";

  const { metaByCategory, componentNamesByMeta } = useMemo(
    () => getMetaMaps(metaByComponentName),
    [metaByComponentName]
  );
  const { dragCard, draggableContainerRef } = useDraggable({
    publish,
    metaByComponentName,
  });

  const handleSearch = (e: FormEvent<HTMLInputElement>) => {
    setSearchText((e.target as HTMLInputElement).value);
  };

  return (
    <Root ref={draggableContainerRef}>
      <Header
        title="Components"
        suffix={<CloseButton onClick={() => onSetActiveTab("none")} />}
      />

      <SearchField
        autoFocus
        value={searchText}
        title="Search"
        placeholder="Search..."
        onInput={handleSearch}
        onCancel={() => setSearchText("")}
        css={{
          mx: theme.spacing[9],
          mt: theme.spacing[9],
          mb: theme.spacing[9],
        }}
      />

      <Separator />

      <ScrollArea>
        {componentCategories
          .filter((category) => {
            if (category === "hidden") {
              return false;
            }

            // Only xml category is allowed for xml document type
            if (documentType === "xml") {
              return category === "xml" || category === "data";
            }
            // Hide xml category for non-xml document types
            if (category === "xml") {
              return false;
            }

            if (
              isFeatureEnabled("internalComponents") === false &&
              category === "internal"
            ) {
              return false;
            }

            return true;
          })
          .map((category) => {
            const meta = (metaByCategory.get(category) ?? []).filter(
              (meta: WsComponentMeta) => {
                if (documentType === "xml" && meta.category === "data") {
                  return componentNamesByMeta.get(meta) === "ws:collection";
                }
                return true;
              }
            );
            const matchedMeta = matchSorter(meta, searchText, {
              keys: [(item) => componentNamesByMeta.get(item) || ""],
            });

            return {
              category,
              meta: matchedMeta,
            };
          })
          .filter((category) => {
            return category.meta.length > 0;
          })
          .map((categoryGroup) => (
            <CollapsibleSection
              label={categoryGroup.category}
              key={categoryGroup.category}
              fullWidth
            >
              <List asChild>
                <Flex
                  gap="2"
                  wrap="wrap"
                  css={{ px: theme.spacing[9], overflow: "auto" }}
                >
                  {categoryGroup.meta.map((meta: WsComponentMeta, index) => {
                    const component = componentNamesByMeta.get(meta);
                    if (component === undefined) {
                      return;
                    }
                    if (
                      isFeatureEnabled("filters") === false &&
                      component === "RemixForm"
                    ) {
                      return;
                    }
                    if (
                      isFeatureEnabled("cms") === false &&
                      component === "ContentEmbed"
                    ) {
                      return;
                    }
                    return (
                      <ListItem
                        asChild
                        index={index}
                        key={component}
                        onSelect={(event) => {
                          const component = elementToComponentName(
                            event.target as HTMLElement,
                            metaByComponentName
                          );
                          if (component) {
                            onSetActiveTab("none");
                            insert(component);
                          }
                        }}
                      >
                        <ComponentCard
                          {...{ [dragItemAttribute]: component }}
                          label={getInstanceLabel({ component }, meta)}
                          description={meta.description}
                          icon={<MetaIcon size="auto" icon={meta.icon} />}
                        />
                      </ListItem>
                    );
                  })}
                  {dragCard}
                </Flex>
              </List>
            </CollapsibleSection>
          ))}
      </ScrollArea>
    </Root>
  );
};

export const Icon = PlusIcon;

export const label = "Components";
