import { Home } from "./components/Home";
import { Login } from "./components/Login";
import { Register } from "./components/Register";
import PrivateRoute from "./components/PrivateRoute";
import { LikedSongs } from "./components/LikedSongs";
import { Search } from "./components/Search";
import { Profile } from "./components/Profile";
import { Matchmaking } from "./components/Matchmaking";
import { DirectChat } from "./components/DirectChat";
import { Chats } from "./components/Chats";

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
                element: <LikedSongs />
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
                path: 'directchat/:chatId',
                element: <DirectChat />
            }
        ]
    }
];

export default AppRoutes;
