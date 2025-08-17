import {account, appwriteConfig, database} from "~/appwrite/client";
import {ID, OAuthProvider, Query} from "appwrite";
import {redirect} from "react-router";

export const loginWithGoogle = async () => {
    try {
        // Request Google OAuth session with profile/email scopes to allow People API access
        await account.createOAuth2Session(
            OAuthProvider.Google,
            undefined,
            undefined,
            [
                "https://www.googleapis.com/auth/userinfo.profile",
                "https://www.googleapis.com/auth/userinfo.email",
            ]
        );
    } catch (e) {
        console.error("loginWithGoogle", e);
    }
}

export const getUser = async () => {
    try {
        const user = await account.get();

        if(!user) {
            return redirect("/sign-in")
        }

        const { documents } = await database.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.userCollectionId,
            [
                Query.equal("accountId", user.$id),
                Query.select(["name", "email", "imageUrl", "joinedAt", "accountId"])
            ]
        );
    }catch (e) {
        console.error(e);
    }
}

export const logoutUser = async () => {
    try {
        await account.deleteSession("current");
        return true;
    }catch (e) {
        console.error("logoutUser error: ", e);
        return false;
    }
}



export const getGooglePicture = async (): Promise<string | null> => {
    try {
        // Get current OAuth session to retrieve Google access token
        const session: any = await account.getSession("current");
        const accessToken: string | undefined = session?.providerAccessToken;

        if (!accessToken) {
            console.warn("Google access token not found on session. Ensure OAuth login was done via Google and scopes include userinfo.profile.");
            return null;
        }

        const resp = await fetch("https://people.googleapis.com/v1/people/me?personFields=photos", {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        if (!resp.ok) {
            console.error("Failed to fetch Google profile photo", resp.status, await resp.text());
            return null;
        }

        const data: any = await resp.json();
        const photos: Array<{ url?: string; default?: boolean; isDefault?: boolean; primary?: boolean }>
            = data?.photos || [];

        if (!photos.length) return null;

        const primary = photos.find(p => (p as any).primary === true) || photos[0];
        return primary?.url ?? null;
    } catch (e) {
        console.error("getGooglePicture", e);
        return null;
    }
}

export const storeUserData = async () => {
    try {
        const user = await account.get();
        if (!user) return null;

        const { documents } = await database.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.userCollectionId,
            [Query.equal("accountId", user.$id)]
        )

        if (documents.length > 0) return documents[0];

        const imageUrl =  await getGooglePicture();

        const newUser = await database.createDocument(
            appwriteConfig.databaseId,
            appwriteConfig.userCollectionId,
            ID.unique(),
            {
                accountId: user.$id,
                email: user.email,
                name: user.name,
                imageUrl: imageUrl || "",
                joinedAt: new Date().toISOString()
            }
        );

        return newUser;

    }catch (e) {
        console.error(e);
    }
}

export const getExistingUser = async () => {
    try {

    }catch (e) {
        console.error(e);
    }
}