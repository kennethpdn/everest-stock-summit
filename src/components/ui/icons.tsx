import type { ComponentProps } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowDownUpAcrossLine,
  faArrowLeft,
  faArrowRight,
  faBell,
  faBox,
  faBoxesStacked,
  faBuilding,
  faCartShopping,
  faChartColumn,
  faCheck,
  faCheckCircle,
  faChevronDown,
  faChevronLeft,
  faChevronRight,
  faChevronUp,
  faCircle,
  faCircleCheck,
  faCircleUser,
  faCircleXmark,
  faClock,
  faGear,
  faGripVertical,
  faPlus,
  faPenToSquare,
  faImage,
  faFilter,
  faBan,
  faTrash,
  faRotateLeft,
  faTags,
  faCloudArrowUp,
  faEye,
  faEyeSlash,
  faLock,
  faMagnifyingGlass,
  faMinus,
  faMountain,
  faRightFromBracket,
  faShieldHalved,
  faTruck,
  faUserCheck,
  faUserPlus,
  faUsers,
  faWarehouse,
  faBars,
  faSpinner,
  faTriangleExclamation,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

type FontAwesomeProps = ComponentProps<typeof FontAwesomeIcon>;

type IconProps = Omit<FontAwesomeProps, "icon" | "size"> & {
  size?: FontAwesomeProps["size"] | number;
  strokeWidth?: number;
};

function makeIcon(icon: IconDefinition) {
  return function AwesomeIcon({ strokeWidth: _strokeWidth, size, ...props }: IconProps) {
    return <FontAwesomeIcon icon={icon} size={typeof size === "number" ? undefined : size} {...props} />;
  };
}

export const ArrowDownUp = makeIcon(faArrowDownUpAcrossLine);
export const ArrowLeft = makeIcon(faArrowLeft);
export const ArrowRight = makeIcon(faArrowRight);
export const Bell = makeIcon(faBell);
export const Boxes = makeIcon(faBoxesStacked);
export const Building2 = makeIcon(faBuilding);
export const Check = makeIcon(faCheck);
export const CheckCircle2 = makeIcon(faCircleCheck);
export const ChevronDown = makeIcon(faChevronDown);
export const ChevronDownIcon = ChevronDown;
export const ChevronLeft = makeIcon(faChevronLeft);
export const ChevronLeftIcon = ChevronLeft;
export const ChevronRight = makeIcon(faChevronRight);
export const ChevronRightIcon = ChevronRight;
export const ChevronUp = makeIcon(faChevronUp);
export const Circle = makeIcon(faCircle);
export const CircleUserRound = makeIcon(faCircleUser);
export const Clock3 = makeIcon(faClock);
export const FileChartColumn = makeIcon(faChartColumn);
export const Eye = makeIcon(faEye);
export const EyeOff = makeIcon(faEyeSlash);
export const GripVertical = makeIcon(faGripVertical);
export const LayoutDashboard = makeIcon(faChartColumn);
export const LoaderCircle = makeIcon(faSpinner);
export const LockKeyhole = makeIcon(faLock);
export const LogOut = makeIcon(faRightFromBracket);
export const Menu = makeIcon(faBars);
export const Minus = makeIcon(faMinus);
export const MoreHorizontal = makeIcon(faMinus);
export const Mountain = makeIcon(faMountain);
export const Package = makeIcon(faBox);
export const PackageCheck = makeIcon(faCheckCircle);
export const PanelLeft = makeIcon(faWarehouse);
export const Search = makeIcon(faMagnifyingGlass);
export const Settings = makeIcon(faGear);
export const ShieldCheck = makeIcon(faShieldHalved);
export const ShoppingCart = makeIcon(faCartShopping);
export const TriangleAlert = makeIcon(faTriangleExclamation);
export const Truck = makeIcon(faTruck);
export const UserCheck = makeIcon(faUserCheck);
export const UserPlus = makeIcon(faUserPlus);
export const Users = makeIcon(faUsers);
export const X = makeIcon(faXmark);
export const XCircle = makeIcon(faCircleXmark);
export const Plus = makeIcon(faPlus);
export const Pencil = makeIcon(faPenToSquare);
export const ImageIcon = makeIcon(faImage);
export const Filter = makeIcon(faFilter);
export const Ban = makeIcon(faBan);
export const Trash = makeIcon(faTrash);
export const RotateLeft = makeIcon(faRotateLeft);
export const Tags = makeIcon(faTags);
export const CloudUpload = makeIcon(faCloudArrowUp);