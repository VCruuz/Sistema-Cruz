package com.cruzengenharia.sistema.controller;

// --- CONTROLLER DE USUÁRIO / LOGIN ---

import com.cruzengenharia.sistema.model.Usuario;
import com.cruzengenharia.sistema.service.UsuarioService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/usuarios")
@RequiredArgsConstructor
public class UsuarioController {

    private final UsuarioService usuarioService;

    // --- LOGIN: POST /api/usuarios/login ---
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> credenciais) {
        try {
            Usuario usuario = usuarioService.login(
                credenciais.get("email"),
                credenciais.get("senha")
            );
            // Retorna dados sem a senha
            return ResponseEntity.ok(Map.of(
                "idUsuario", usuario.getIdUsuario(),
                "nome", usuario.getNome(),
                "email", usuario.getEmail()
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.status(401).body(Map.of("erro", e.getMessage()));
        }
    }

    // --- LOGOUT: apenas resposta simbólica (stateless) ---
    @PostMapping("/logout")
    public ResponseEntity<?> logout() {
        return ResponseEntity.ok(Map.of("mensagem", "Logout realizado com sucesso."));
    }

    @PostMapping("/cadastrar")
    public ResponseEntity<Usuario> cadastrar(@RequestBody Usuario usuario) {
        return ResponseEntity.ok(usuarioService.cadastrar(usuario));
    }
}
