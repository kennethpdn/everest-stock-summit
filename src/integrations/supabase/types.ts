export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_bootstrap_emails: {
        Row: {
          created_at: string
          email: string
          note: string | null
        }
        Insert: {
          created_at?: string
          email: string
          note?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          note?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          actif: boolean
          created_at: string
          description: string | null
          id: string
          nom: string
          updated_at: string
        }
        Insert: {
          actif?: boolean
          created_at?: string
          description?: string | null
          id?: string
          nom: string
          updated_at?: string
        }
        Update: {
          actif?: boolean
          created_at?: string
          description?: string | null
          id?: string
          nom?: string
          updated_at?: string
        }
        Relationships: []
      }
      centres: {
        Row: {
          actif: boolean
          adresse: string | null
          contact_nom: string | null
          contact_telephone: string | null
          created_at: string
          id: string
          nom: string
          type_centre: Database["public"]["Enums"]["type_centre"]
          updated_at: string
          zone: string | null
        }
        Insert: {
          actif?: boolean
          adresse?: string | null
          contact_nom?: string | null
          contact_telephone?: string | null
          created_at?: string
          id?: string
          nom: string
          type_centre?: Database["public"]["Enums"]["type_centre"]
          updated_at?: string
          zone?: string | null
        }
        Update: {
          actif?: boolean
          adresse?: string | null
          contact_nom?: string | null
          contact_telephone?: string | null
          created_at?: string
          id?: string
          nom?: string
          type_centre?: Database["public"]["Enums"]["type_centre"]
          updated_at?: string
          zone?: string | null
        }
        Relationships: []
      }
      demandes_reapprovisionnement: {
        Row: {
          centre_id: string
          created_at: string
          demandeur_id: string
          id: string
          produit_id: string
          quantite_demandee: number
          statut: Database["public"]["Enums"]["statut_demande"]
          updated_at: string
          validateur_id: string | null
        }
        Insert: {
          centre_id: string
          created_at?: string
          demandeur_id?: string
          id?: string
          produit_id: string
          quantite_demandee: number
          statut?: Database["public"]["Enums"]["statut_demande"]
          updated_at?: string
          validateur_id?: string | null
        }
        Update: {
          centre_id?: string
          created_at?: string
          demandeur_id?: string
          id?: string
          produit_id?: string
          quantite_demandee?: number
          statut?: Database["public"]["Enums"]["statut_demande"]
          updated_at?: string
          validateur_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "demandes_reapprovisionnement_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demandes_reapprovisionnement_produit_id_fkey"
            columns: ["produit_id"]
            isOneToOne: false
            referencedRelation: "produits"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_audit: {
        Row: {
          action: string
          auteur_id: string | null
          auteur_nom: string | null
          categorie: string
          cible: string | null
          created_at: string
          description: string | null
          details: Json | null
          id: string
        }
        Insert: {
          action: string
          auteur_id?: string | null
          auteur_nom?: string | null
          categorie: string
          cible?: string | null
          created_at?: string
          description?: string | null
          details?: Json | null
          id?: string
        }
        Update: {
          action?: string
          auteur_id?: string | null
          auteur_nom?: string | null
          categorie?: string
          cible?: string | null
          created_at?: string
          description?: string | null
          details?: Json | null
          id?: string
        }
        Relationships: []
      }
      mouvements_stock: {
        Row: {
          centre_destination_id: string | null
          centre_source_id: string | null
          created_at: string
          id: string
          motif: string | null
          produit_id: string
          quantite_unites: number
          type_mouvement: Database["public"]["Enums"]["type_mouvement"]
          utilisateur_id: string
          utilisateur_nom: string | null
        }
        Insert: {
          centre_destination_id?: string | null
          centre_source_id?: string | null
          created_at?: string
          id?: string
          motif?: string | null
          produit_id: string
          quantite_unites: number
          type_mouvement: Database["public"]["Enums"]["type_mouvement"]
          utilisateur_id: string
          utilisateur_nom?: string | null
        }
        Update: {
          centre_destination_id?: string | null
          centre_source_id?: string | null
          created_at?: string
          id?: string
          motif?: string | null
          produit_id?: string
          quantite_unites?: number
          type_mouvement?: Database["public"]["Enums"]["type_mouvement"]
          utilisateur_id?: string
          utilisateur_nom?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mouvements_stock_centre_destination_id_fkey"
            columns: ["centre_destination_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mouvements_stock_centre_source_id_fkey"
            columns: ["centre_source_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mouvements_stock_produit_id_fkey"
            columns: ["produit_id"]
            isOneToOne: false
            referencedRelation: "produits"
            referencedColumns: ["id"]
          },
        ]
      }
      parametres: {
        Row: {
          devise: string
          format_unites: string
          fuseau_horaire: string
          id: boolean
          seuil_alerte_defaut: number
          updated_at: string
        }
        Insert: {
          devise?: string
          format_unites?: string
          fuseau_horaire?: string
          id?: boolean
          seuil_alerte_defaut?: number
          updated_at?: string
        }
        Update: {
          devise?: string
          format_unites?: string
          fuseau_horaire?: string
          id?: boolean
          seuil_alerte_defaut?: number
          updated_at?: string
        }
        Relationships: []
      }
      produits: {
        Row: {
          actif: boolean
          categorie_id: string | null
          created_at: string
          id: string
          nom: string
          photo_url: string | null
          prix_pack: number
          prix_unitaire: number
          reference_format: string
          sku_code_barres: string | null
          unites_par_pack: number
          updated_at: string
        }
        Insert: {
          actif?: boolean
          categorie_id?: string | null
          created_at?: string
          id?: string
          nom: string
          photo_url?: string | null
          prix_pack?: number
          prix_unitaire?: number
          reference_format?: string
          sku_code_barres?: string | null
          unites_par_pack?: number
          updated_at?: string
        }
        Update: {
          actif?: boolean
          categorie_id?: string | null
          created_at?: string
          id?: string
          nom?: string
          photo_url?: string | null
          prix_pack?: number
          prix_unitaire?: number
          reference_format?: string
          sku_code_barres?: string | null
          unites_par_pack?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "produits_categorie_id_fkey"
            columns: ["categorie_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          actif: boolean
          centre_id: string | null
          created_at: string
          email: string
          id: string
          nom_complet: string
          reviewed_at: string | null
          reviewed_by: string | null
          role_souhaite: Database["public"]["Enums"]["app_role"]
          statut: Database["public"]["Enums"]["account_status"]
        }
        Insert: {
          actif?: boolean
          centre_id?: string | null
          created_at?: string
          email: string
          id: string
          nom_complet: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          role_souhaite: Database["public"]["Enums"]["app_role"]
          statut?: Database["public"]["Enums"]["account_status"]
        }
        Update: {
          actif?: boolean
          centre_id?: string | null
          created_at?: string
          email?: string
          id?: string
          nom_complet?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          role_souhaite?: Database["public"]["Enums"]["app_role"]
          statut?: Database["public"]["Enums"]["account_status"]
        }
        Relationships: [
          {
            foreignKeyName: "profiles_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
        ]
      }
      stocks: {
        Row: {
          centre_id: string | null
          created_at: string
          derniere_maj: string
          id: string
          produit_id: string
          quantite_unites: number
          seuil_alerte: number
        }
        Insert: {
          centre_id?: string | null
          created_at?: string
          derniere_maj?: string
          id?: string
          produit_id: string
          quantite_unites?: number
          seuil_alerte?: number
        }
        Update: {
          centre_id?: string | null
          created_at?: string
          derniere_maj?: string
          id?: string
          produit_id?: string
          quantite_unites?: number
          seuil_alerte?: number
        }
        Relationships: [
          {
            foreignKeyName: "stocks_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stocks_produit_id_fkey"
            columns: ["produit_id"]
            isOneToOne: false
            referencedRelation: "produits"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_update_user: {
        Args: {
          _actif: boolean
          _centre: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
      apply_stock_delta: {
        Args: { _centre: string; _delta: number; _produit: string }
        Returns: undefined
      }
      default_seuil_alerte: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_approved: { Args: { _user_id: string }; Returns: boolean }
      log_connexion: { Args: never; Returns: undefined }
      promote_bootstrap_admins: { Args: never; Returns: number }
      review_registration: {
        Args: { _approve: boolean; _user_id: string }
        Returns: undefined
      }
      user_centre_id: { Args: { _user_id: string }; Returns: string }
      write_audit: {
        Args: {
          _action: string
          _categorie: string
          _cible: string
          _description: string
          _details: Json
        }
        Returns: undefined
      }
    }
    Enums: {
      account_status: "pending" | "approved" | "rejected"
      app_role: "admin" | "gestionnaire_entrepot" | "responsable_centre"
      statut_demande:
        | "en_attente"
        | "validee"
        | "en_livraison"
        | "livree"
        | "refusee"
      type_centre: "bar" | "restaurant" | "supermarche" | "lounge" | "depot"
      type_mouvement:
        | "entree"
        | "sortie_vers_centre"
        | "vente"
        | "retour"
        | "casse_invendu"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_status: ["pending", "approved", "rejected"],
      app_role: ["admin", "gestionnaire_entrepot", "responsable_centre"],
      statut_demande: [
        "en_attente",
        "validee",
        "en_livraison",
        "livree",
        "refusee",
      ],
      type_centre: ["bar", "restaurant", "supermarche", "lounge", "depot"],
      type_mouvement: [
        "entree",
        "sortie_vers_centre",
        "vente",
        "retour",
        "casse_invendu",
      ],
    },
  },
} as const
