import { Home } from "./components/Home";
import { Login } from "./components/Login";
import { Register } from "./components/Register";
import PrivateRoute from "./components/PrivateRoute";
import { Search } from "./components/Search";
import { Profile } from "./components/Profile";
import { Matchmaking } from "./components/Matchmaking";
import { DirectChat } from "./components/DirectChat";
import { Chats } from "./components/Chats";
import { Rooms } from "./components/Rooms";
import { Room } from "./components/Room";
import DomeGallery from "./components/DomeGallery";

const AppRoutes = [
    {
        path: '/login',
        element: <Login />
    },
    {
        path: '/register',
        element: <Register />
    },
    {
        path: '/search',
        element: <Search />
    },
    {
        path: '/',
        element: <PrivateRoute />,
        children: [
            {
                index: true,
                element: <Home />
            },
            {
                path: 'liked-songs',
                element: <div style={{ width: '100vw', height: '100vh', position: 'fixed', top: 0, left: 0, zIndex: 0 }}><DomeGallery /></div>
            },
            {
                path: 'profile',
                element: <Profile />
            },
            {
                path: 'chats',
                element: <Chats />
            },
            {
                path: 'matchmaking',
                element: <Matchmaking />
            },
            {
                path: 'rooms',
                element: <Rooms />
            },
            {
                path: 'room/:id',
                element: <Room />
            },
            {
                path: 'directchat/:chatId',
                element: <DirectChat />
            }
        ]
    }
];

export default AppRoutes;
