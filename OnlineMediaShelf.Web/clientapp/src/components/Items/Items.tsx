import {
  useContext,
  useEffect,
  useRef,
  useState
} from "react";
import {
  IItemModel,
  IShelfModel,
  ItemAddModel,
  ItemClient,
  ShelfClient
} from "../../OMSWebClient.ts";
import {
  Button,
  Menu,
  MenuItem,
  MenuList,
  MenuPopover,
  Title1,
  Title3,
  Toolbar,
  ToolbarButton,
  ToolbarDivider,
  ToolbarRadioButton,
  useToastController
} from "@fluentui/react-components";
import {
  UserContext
} from "../../App.tsx";
import {
  CreateItemDialog
} from "./CreateItemDialog.tsx";
import {
  showErrorToast,
  showSuccessToast
} from "../../utilities/toastHelper.tsx";
import {
  ItemList
} from "./ItemList.tsx";
import {
  PaginationControls
} from "../PaginationControls.tsx";
import {
  navigateToItem
} from "../../utilities/routes.ts";
import {
  useNavigate
} from "react-router-dom";
import {
  ItemToShelfMenu
} from "../ItemToShelfMenu.tsx";
import {
  Col,
  Row
} from "react-bootstrap";
import {
  ItemGrid
} from "./ItemGrid.tsx";
import {
  FontAwesomeIcon
} from "@fortawesome/react-fontawesome";
import {
  faPlus
} from "@fortawesome/free-solid-svg-icons";
import {
  faListUl
} from "@fortawesome/free-solid-svg-icons/faListUl";
import {
  faBorderAll
} from "@fortawesome/free-solid-svg-icons/faBorderAll";


interface ItemsState {
  items?: IItemModel[];
  selectedItemIds?: number[];
  itemCount: number;
  page: number;
  isDialogOpen: boolean;
  contextMenuOpen?: {
    open: boolean;
    x: number;
    y: number;
    menuItemIds: number[];
  };
  currentUsersShelves?: IShelfModel[];
  displayMode: "list" | "grid";
}

export function Items() {
  const [state, setState] = useState<ItemsState>({
    isDialogOpen: false,
    itemCount: 0,
    page: 0,
    selectedItemIds: [],
    displayMode: "list"
  });

  const pageSize = 30;

  const {user} = useContext(UserContext);

  const {dispatchToast} = useToastController();
  const navigate = useNavigate();

  const contextMenuTargetElementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function populateItems() {
      const client = new ItemClient();

      try {
        let itemCount = await client.getItemCount();
        let items = await client.getItems(pageSize, state.page);

        setState({
          ...state,
          items: items,
          itemCount: itemCount
        })
      } catch (e: any) {
        showErrorToast("An error occured while loading the items", dispatchToast)
      }
    }

    populateItems();
  }, [state.page]);

  useEffect(() => {
    async function populateCurrentUsersShelves() {
      const client = new ShelfClient();

      try {
        let shelves = await client.getAllShelves(user?.currentUser?.userName, 0, 0);

        setState(prevState => ({
          ...prevState,
          currentUsersShelves: shelves
        }));
      } catch (e: any) {
        showErrorToast("Couldn't load current users shelves", dispatchToast);
      }
    }

    if (user?.currentUser?.isLoggedIn && !state.currentUsersShelves)
      populateCurrentUsersShelves();
  }, [state.contextMenuOpen, state.selectedItemIds]);

  const toolbarChangeValues = (_: any, {
    name,
    checkedItems
  }: {
    name: string,
    checkedItems: string[]
  }) => {
    setState(prevState => ({
      ...prevState,
      [name]: checkedItems[0]
    }));
  };

  return <>
    <CreateItemDialog
      open={state.isDialogOpen}
      onOpenChange={(_, data) => setState({
        ...state,
        isDialogOpen: data.open
      })}/>

    <div
      ref={contextMenuTargetElementRef}
      style={{
        position: "fixed",
        top: state.contextMenuOpen?.y ?? 0,
        left: state.contextMenuOpen?.x ?? 0,
      }}/>

    {user?.currentUser?.isLoggedIn &&
        <Menu
            positioning={{
              target: contextMenuTargetElementRef.current!,
              position: "below",
              align: "start"
            }}
            open={state.contextMenuOpen?.open ?? false}
            onOpenChange={(_, data) => {
              setState(prevState => ({
                ...prevState,
                contextMenuOpen: {
                  open: data.open,
                  x: prevState.contextMenuOpen!.x,
                  y: prevState.contextMenuOpen!.y,
                  menuItemIds: prevState.contextMenuOpen!.menuItemIds
                }
              }));
            }}>
            <MenuPopover
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}>
                <MenuList>
                    <ItemToShelfMenu
                        currentUsersShelves={state.currentUsersShelves ?? []}
                        shelfAction={async function (shelfId: number) {
                          const client = new ShelfClient();
                          await Promise.all<void>(state.contextMenuOpen!.menuItemIds.map(itemId => client.addItem(shelfId, new ItemAddModel({id: itemId}))));

                          showSuccessToast(`${state.contextMenuOpen && state.contextMenuOpen.menuItemIds.length > 1 ? `${state.contextMenuOpen.menuItemIds.length} Items` : "Item"} added to shelf`, dispatchToast);

                          setState(prevState => ({
                            ...prevState,
                            selectedItemIds: []
                          }));
                        }}>
                        <MenuItem>Add to Shelf</MenuItem>
                    </ItemToShelfMenu>
                </MenuList>
            </MenuPopover>
        </Menu>}

    {user?.currentUser?.isLoggedIn && state.selectedItemIds && state.selectedItemIds.length > 0 &&
        <Row
            className="position-fixed bottom-0 end-0 m-0 p-3 w-100 bg-body z-3 shadow"
            md={"2"}
            xs={"1"}>
            <Col
                className={"m-0 d-flex justify-content-center align-items-center"}>
                <Title3>{state.selectedItemIds.length} items selected</Title3>
            </Col>
            <Col
                className={"my-2"}>
                <ItemToShelfMenu
                    currentUsersShelves={state.currentUsersShelves ?? []}
                    shelfAction={async function (shelfId: number) {
                      const client = new ShelfClient();
                      await Promise.all<void>(state.selectedItemIds!.map(itemId => client.addItem(shelfId, new ItemAddModel({id: itemId}))));

                      showSuccessToast(`${state.selectedItemIds!.length > 1 ? `${state.selectedItemIds!.length} Items` : "Item"} added to shelf`, dispatchToast);

                      setState(prevState => ({
                        ...prevState,
                        selectedItemIds: []
                      }));
                    }}>
                    <Button>Add to Shelf</Button>
                </ItemToShelfMenu>
            </Col>
        </Row>}


    <Title1>Items</Title1>

    <Toolbar
      defaultCheckedValues={{
        displayMode: ["list"]
      }}
      onCheckedValueChange={toolbarChangeValues}>
      {user?.currentUser?.isLoggedIn ?
        <ToolbarButton
          appearance={"primary"}
          icon={
            <FontAwesomeIcon
              icon={faPlus}/>}
          onClick={() => setState({
            ...state,
            isDialogOpen: true
          })}>Create Item</ToolbarButton> :
        <></>}
      <ToolbarDivider/>
      <ToolbarRadioButton
        name={"displayMode"}
        value={"list"}
        appearance={"subtle"}
        icon={
          <FontAwesomeIcon
            icon={faListUl}/>}/>
      <ToolbarRadioButton
        appearance={"subtle"}
        name={"displayMode"}
        value={"grid"}
        icon={
          <FontAwesomeIcon
            icon={faBorderAll}/>}/>
    </Toolbar>

    {state.items !== undefined && <>
      {state.displayMode === "list" &&
          <ItemList
              items={state.items}
              showSelect
              selectedItems={state.selectedItemIds}
              onItemSelect={(itemId) => setState(prevState => ({
                ...prevState,
                selectedItemIds: prevState.selectedItemIds?.concat(itemId)
              }))}
              onItemDeselect={(itemId) => setState(prevState => ({
                ...prevState,
                selectedItemIds: prevState.selectedItemIds?.filter(_ => _ !== itemId)
              }))}
              onItemsRightClick={(e, itemIds) => {
                e.preventDefault();
                e.stopPropagation();

                if (itemIds.length == 0) {
                  return;
                }

                setState(prevState => ({
                  ...prevState,
                  contextMenuOpen: {
                    open: true,
                    x: e.clientX,
                    y: e.clientY,
                    menuItemIds: itemIds
                  },
                }));
              }}
              onItemClick={(itemId) => navigateToItem(itemId, navigate)}/>}
      {state.displayMode === "grid" &&
          <ItemGrid
              items={state.items}
              showSelect
              selectedItems={state.selectedItemIds}
              onItemSelect={(itemId) => setState(prevState => ({
                ...prevState,
                selectedItemIds: prevState.selectedItemIds?.concat(itemId)
              }))}
              onItemDeselect={(itemId) => setState(prevState => ({
                ...prevState,
                selectedItemIds: prevState.selectedItemIds?.filter(_ => _ !== itemId)
              }))}
              onItemsRightClick={(e, itemIds) => {
                e.preventDefault();
                e.stopPropagation();

                if (itemIds.length == 0) {
                  return;
                }

                setState(prevState => ({
                  ...prevState,
                  contextMenuOpen: {
                    open: true,
                    x: e.clientX,
                    y: e.clientY,
                    menuItemIds: itemIds
                  },
                }));
              }}
              onItemClick={(itemId) => navigateToItem(itemId, navigate)}/>}
    </>}

    <PaginationControls
      pageCount={Math.ceil(state.itemCount / pageSize)}
      page={state.page}
      onPageChange={(newPage) => setState(prevState => ({
        ...prevState,
        page: newPage,
      }))}/>
  </>;
}