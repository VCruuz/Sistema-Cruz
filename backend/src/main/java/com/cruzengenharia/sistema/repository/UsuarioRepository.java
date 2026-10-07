package com.cruzengenharia.sistema.repository;

import com.cruzengenharia.sistema.model.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    // --- BUSCA POR EMAIL PARA LOGIN ---
    Optional<Usuario> findByEmail(String email);
}
